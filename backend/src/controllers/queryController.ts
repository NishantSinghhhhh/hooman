// backend/controllers/queryController.ts

import { Request, Response } from 'express';
import { AgentOrchestrator } from '../services/AgentOrchestrator';
import { QueryData, QueryClassification } from '../types/agent';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

// Store query results and status
interface QueryResult {
  queryId: string;
  userId: string;
  classification: QueryClassification;
  timestamp: string;
  status: 'processing' | 'completed' | 'error';
  error?: string;
  processingTime?: number;
}

const queryResults: Map<string, QueryResult> = new Map();
const queryStatus: Map<string, 'processing' | 'completed' | 'error'> = new Map();

class QueryController {
  private orchestrator: AgentOrchestrator;

  constructor() {
    this.orchestrator = new AgentOrchestrator({
      useOllama: process.env.USE_OLLAMA === 'true',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'llama2',
      temperature: 0.3,
    });

    console.log('✅ QueryController initialized with AgentOrchestrator');
  }

  public uploadMiddleware = upload.array('files', 10);

  public submitQuery = async (req: Request, res: Response): Promise<void> => {
    try {

      const { textQuery, userId } = req.body;
      const files = req.files as Express.Multer.File[];

      // Authentication check
      if (!req.user || req.user._id.toString() !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized: User ID mismatch'
        });
        return;
      }

      // Validation
      if ((!textQuery || !textQuery.trim()) && (!files || files.length === 0)) {
        res.status(400).json({
          success: false,
          error: 'Query must include text or files',
        });
        return;
      }

      const queryId = uuidv4();

      const queryData: QueryData = {
        textQuery: textQuery || '',
        files: files?.map(file => ({
          filename: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
        })) || [],
        userId,
        queryId,
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        }
      };

      console.log(`📥 New query submitted: ${queryId}`);
      console.log(`👤 User: ${userId}`);
      console.log(`📝 Text: ${textQuery?.substring(0, 100)}...`);
      console.log(`📁 Files: ${files?.length || 0}`);

      queryStatus.set(queryId, 'processing');

      // Process query asynchronously
      this.processQueryAsync(queryId, queryData);

      res.status(202).json({
        success: true,
        queryId,
        status: 'processing',
        message: 'Query submitted successfully. Use the query ID to check status.',
        estimatedTime: this.estimateProcessingTime(queryData),
      });
    } catch (error) {
      console.error('❌ Submit query error:', error);
      if (req.files) {
        const files = req.files as Express.Multer.File[];
        files.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.warn(`Failed to cleanup file: ${file.path}`, err);
          });
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to submit query',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };

  private async processQueryAsync(queryId: string, queryData: QueryData): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing query ${queryId}...`);
      const classification = await this.orchestrator.processQuery(queryData);

      const processingTime = Date.now() - startTime;

      console.log(`📊 Query ${queryId} classification result:`, classification);

      // Store the result
      const queryResult: QueryResult = {
        queryId,
        userId: queryData.userId,
        classification,
        timestamp: new Date().toISOString(),
        status: 'completed',
        processingTime
      };

      queryResults.set(queryId, queryResult);
      queryStatus.set(queryId, 'completed');

      console.log(`✅ Query ${queryId} completed successfully`);
      console.log(`⏱️  Processing time: ${processingTime}ms`);

      // Cleanup files after processing
      this.cleanupFiles(queryData);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`❌ Query ${queryId} processing failed:`, error);

      queryStatus.set(queryId, 'error');

      // Create error result
      const errorResult: QueryResult = {
        queryId,
        userId: queryData.userId,
        classification: {
          classification: 'TEXT',
          agentType: 'document',
          reasoning: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
          priority: 'low',
          confidence: 0.0,
          hasTextQuery: !!queryData.textQuery,
          fileCount: queryData.files?.length || 0,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        processingTime
      };

      queryResults.set(queryId, errorResult);

      // Cleanup files
      this.cleanupFiles(queryData);
    }
  }

  public getQueryResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const { queryId } = req.params;
      const userId = (req as any).user?.userId || (req as any).user?._id?.toString();
      
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const status = queryStatus.get(queryId);
      const result = queryResults.get(queryId);

      if (!status) {
        res.status(404).json({ success: false, error: 'Query not found' });
        return;
      }

      if (result?.userId !== userId) {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (status === 'processing') {
        res.status(202).json({ 
          success: true, 
          status: 'processing',
          message: 'Query is still being processed'
        });
        return;
      }

      if (status === 'completed' && result) {
        res.status(200).json({ 
          success: true, 
          status: 'completed', 
          result: {
            queryId: result.queryId,
            classification: result.classification,
            agentType: result.classification.agentType,
            reasoning: result.classification.reasoning,
            confidence: result.classification.confidence,
            priority: result.classification.priority,
            processingTime: result.processingTime,
            timestamp: result.timestamp
          }
        });
        return;
      }

      if (status === 'error' && result) {
        res.status(200).json({
          success: true,
          status: 'failed',
          error: result.error || 'Processing failed',
          result: {
            queryId: result.queryId,
            classification: result.classification,
            agentType: result.classification.agentType,
            error: result.error,
            processingTime: result.processingTime,
            timestamp: result.timestamp
          }
        });
        return;
      }

      res.status(500).json({ 
        success: false, 
        error: 'Unknown query status' 
      });

    } catch (error) {
      console.error('Error getting query result:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve query result' 
      });
    }
  };

  public getQueryStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { queryId } = req.params;
      const userId = (req as any).user?.userId || (req as any).user?._id?.toString();
      
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const status = queryStatus.get(queryId);
      const result = queryResults.get(queryId);

      if (!status) {
        res.status(404).json({ success: false, error: 'Query not found' });
        return;
      }

      if (result?.userId !== userId) {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (status === 'processing') {
        res.status(200).json({
          success: true,
          status: 'processing',
          message: 'Query is still being processed',
        });
        return;
      }

      if (status === 'completed' && result) {
        res.status(200).json({
          success: true,
          status: 'completed',
          result: {
            agentType: result.classification.agentType,
            classification: result.classification.classification,
            reasoning: result.classification.reasoning,
            confidence: Math.round(result.classification.confidence * 100),
            priority: result.classification.priority,
            processingTime: result.processingTime || 0,
            timestamp: result.timestamp,
          }
        });
        return;
      }

      if (status === 'error') {
        res.status(200).json({
          success: true,
          status: 'failed',
          error: result?.error || 'Processing failed',
          result: {
            agentType: result?.classification.agentType || 'unknown',
            error: result?.error,
            processingTime: result?.processingTime || 0,
            timestamp: result?.timestamp,
          }
        });
        return;
      }
    } catch (error) {
      console.error('Error getting query status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get query status'
      });
    }
  };

  public getQueryHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.userId || (req as any).user?._id?.toString();
      
      if (userId !== currentUserId) {
        res.status(403).json({ success: false, error: 'Unauthorized: User ID mismatch' });
        return;
      }

      const userQueries = Array.from(queryResults.values())
        .filter(q => q.userId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);

      res.status(200).json({
        success: true,
        queries: userQueries.map(q => ({
          queryId: q.queryId,
          timestamp: q.timestamp,
          agentType: q.classification.agentType,
          classification: q.classification.classification,
          status: q.status,
          confidence: Math.round(q.classification.confidence * 100),
          priority: q.classification.priority,
          reasoning: q.classification.reasoning.substring(0, 200) + '...',
          processingTime: q.processingTime,
          error: q.error
        }))
      });
    } catch (error) {
      console.error('Error getting query history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve query history' 
      });
    }
  };

  public getCapabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      // Since AgentOrchestrator doesn't have getAgentCapabilities, 
      // we'll return static capabilities based on what we know
      const capabilities = {
        classification: {
          supportedTypes: ['TEXT', 'DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO'],
          agents: ['document', 'image', 'video', 'audio'],
          maxFileSize: '100MB',
          maxFiles: 10
        },
        routing: {
          mcpBackend: process.env.MCP_BACKEND_URL || 'http://localhost:8000',
          supportedFormats: {
            image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
            video: ['.mp4', '.avi', '.mov', '.mkv'],
            audio: ['.mp3', '.wav', '.m4a', '.flac'],
            document: ['.txt', '.pdf', '.docx', '.doc']
          }
        },
        features: {
          realTimeClassification: true,
          batchProcessing: false,
          asyncProcessing: true,
          fileUpload: true,
          textQuery: true,
          multimodal: true
        }
      };

      res.status(200).json({ 
        success: true, 
        capabilities,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting capabilities:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve capabilities' 
      });
    }
  };

  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.orchestrator.healthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({ 
        success: true, 
        health: {
          ...health,
          controller: 'QueryController',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          queryCount: queryResults.size
        }
      });
    } catch (err) {
      console.error('Health check failed:', err);
      res.status(503).json({ 
        success: false, 
        error: 'Health check failed',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  };

  private cleanupFiles(queryData: QueryData): void {
    queryData.files?.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.warn(`Failed to cleanup file: ${file.path}`, err);
        } else {
          console.log(`🗑️  Cleaned up file: ${file.filename}`);
        }
      });
    });
  }

  private estimateProcessingTime(queryData: QueryData): string {
    const fileCount = queryData.files?.length || 0;
    const hasVideo = queryData.files?.some(f => f.mimetype.startsWith('video/'));
    const hasAudio = queryData.files?.some(f => f.mimetype.startsWith('audio/'));
    const hasImages = queryData.files?.some(f => f.mimetype.startsWith('image/'));

    if (hasVideo) return '30-120 seconds';
    if (hasAudio) return '15-60 seconds';
    if (hasImages && fileCount > 3) return '10-30 seconds';
    if (fileCount > 5) return '20-45 seconds';
    if (fileCount > 0) return '5-20 seconds';
    return '2-10 seconds';
  }

  // Additional utility methods
  public clearExpiredQueries(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [queryId, result] of queryResults.entries()) {
      const queryTime = new Date(result.timestamp).getTime();
      if (now - queryTime > maxAge) {
        queryResults.delete(queryId);
        queryStatus.delete(queryId);
        console.log(`🗑️  Expired query removed: ${queryId}`);
      }
    }
  }

  public getStats(): object {
    const statuses = Array.from(queryStatus.values());
    return {
      totalQueries: queryResults.size,
      processing: statuses.filter(s => s === 'processing').length,
      completed: statuses.filter(s => s === 'completed').length,
      failed: statuses.filter(s => s === 'error').length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

export default QueryController;