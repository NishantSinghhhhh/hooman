// backend/controllers/queryController.ts

import { Request, Response } from 'express';
import { AgentOrchestrator } from '../services/AgentOrchestrator';
import { QueryData, QueryClassification } from '../types/agent';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
interface MCPRecord {
  timestamp?: string;
  context?: string;
  query?: string;
  tokens_used?: number;
  crewai_result?: any;
  metadata?: any;
  file_path?: string;
  document_type?: string;
  page_count?: number;
  duration?: number;
  fps?: number;
  resolution?: string;
  format?: string;
  sample_rate?: number;
  channels?: number;
}

interface MCPBackendResponse {
  success: boolean;
  user_id: string;
  total_records: number;
  images?: MCPRecord[];
  documents?: MCPRecord[];
  videos?: MCPRecord[];
  audio?: MCPRecord[];
  activity_summary?: any;
  timestamp: string;
}

interface TransformedQuery {
  queryId: string;
  timestamp: string;
  agentType: 'image' | 'document' | 'video' | 'audio';
  classification: string;
  status: string;
  confidence: number;
  priority: string;
  reasoning: string;
  processingTime: number;
  error: null | string;
  query: string;
  tokens: number;
  result: any;
  metadata: any;
  filePath?: string;
  documentType?: string;
  pageCount?: number;
  duration?: number;
  fps?: number;
  resolution?: string;
  format?: string;
  sampleRate?: number;
  channels?: number;
}

const transformPixeltableData = (data: any): MCPRecord[] => {
  if (!data || !Array.isArray(data._rows) || !Array.isArray(data._col_names)) {
    return []; // Return empty array if data is not in the expected format
  }
  
  const colNames: string[] = data._col_names;
  return data._rows.map((row: any[]) => {
    const obj: { [key: string]: any } = {};
    colNames.forEach((colName: string, index: number) => {
      obj[colName] = row[index];
    });
    return obj as MCPRecord;
  });
};
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
  
      // Process query and get the result
      const result = await this.processQueryAndGetResult(queryId, queryData);
  
      res.status(200).json({
        success: true,
        queryId,
        status: 'completed',
        message: 'Query processed successfully.',
        ...result, // Spread the complete backend response
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
  
  private async processQueryAndGetResult(queryId: string, queryData: QueryData): Promise<any> {
    try {
      // Process the query through the orchestrator (fixed property name)
      const { classification, result, processing_time } = await this.orchestrator.processQuery(queryData);
      
      // Store the classification result (fixed status value)
      queryStatus.set(queryId, 'completed');
      
      // Return the actual result from MCP backend
      return {
        classification,
        result,
        query: queryData.textQuery,
        file_processed: (queryData.files && queryData.files.length > 0),
        processing_time,
        error: null
      };
    } catch (error) {
      // Fixed status value from 'failed' to 'error'
      queryStatus.set(queryId, 'error');
      throw error;
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

 // MAIN FUNCTION with changes applied
public getQueryHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user?.userId || (req as any).user?._id?.toString();
    
    if (userId !== currentUserId) {
      res.status(403).json({ success: false, error: 'Unauthorized: User ID mismatch' });
      return;
    }

    console.log(`📊 Fetching all data for user: ${userId}`);
    
    const mcpBackendUrl = process.env.MCP_BACKEND_URL || 'http://localhost:8001';
    
    try {
      const response = await fetch(`${mcpBackendUrl}/api/user-data/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`MCP Backend responded with status: ${response.status}`);
      }

      const mcpData = await response.json() as MCPBackendResponse;

      console.log('📦 Raw data received from MCP backend.');
      
      // --- APPLY THE TRANSFORMATION ---
      const images = transformPixeltableData(mcpData.images);
      const documents = transformPixeltableData(mcpData.documents);
      const videos = transformPixeltableData(mcpData.videos);
      const audio = transformPixeltableData(mcpData.audio);
      
      console.log(`✅ Successfully parsed data from MCP backend for user ${userId}`);
      
      const transformedQueries: TransformedQuery[] = [];
      
      // Process the CORRECTLY PARSED image data
      if (images.length > 0) {
        images.forEach((record: MCPRecord) => {
          transformedQueries.push({
            queryId: `img_${record.timestamp || Date.now()}`,
            timestamp: record.timestamp || new Date().toISOString(),
            agentType: 'image',
            classification: 'IMAGE',
            status: 'completed',
            confidence: 90,
            priority: 'high',
            reasoning: record.context || 'Image analysis completed',
            processingTime: 0,
            error: null,
            query: record.query || 'Image analysis',
            tokens: record.tokens_used || 0,
            result: record.crewai_result || {},
            metadata: record.metadata || {},
            ...(record.file_path && { filePath: record.file_path })
          });
        });
      }

      // Process the CORRECTLY PARSED document data
      if (documents.length > 0) {
        documents.forEach((record: MCPRecord) => {
          transformedQueries.push({
            queryId: `doc_${record.timestamp || Date.now()}`,
            timestamp: record.timestamp || new Date().toISOString(),
            agentType: 'document',
            classification: 'DOCUMENT',
            status: 'completed',
            confidence: 85,
            priority: 'medium',
            reasoning: record.context || 'Document analysis completed',
            processingTime: 0,
            error: null,
            query: record.query || 'Document analysis',
            tokens: record.tokens_used || 0,
            result: record.crewai_result || {},
            metadata: record.metadata || {},
            ...(record.file_path && { filePath: record.file_path }),
            ...(record.document_type && { documentType: record.document_type }),
            ...(record.page_count !== undefined && { pageCount: record.page_count })
          });
        });
      }

      // Process the CORRECTLY PARSED video data
      if (videos.length > 0) {
        videos.forEach((record: MCPRecord) => {
          transformedQueries.push({
            queryId: `vid_${record.timestamp || Date.now()}`,
            timestamp: record.timestamp || new Date().toISOString(),
            agentType: 'video',
            classification: 'VIDEO',
            status: 'completed',
            confidence: 88,
            priority: 'high',
            reasoning: record.context || 'Video analysis completed',
            processingTime: 0,
            error: null,
            query: record.query || 'Video analysis',
            tokens: record.tokens_used || 0,
            result: record.crewai_result || {},
            metadata: record.metadata || {},
            ...(record.file_path && { filePath: record.file_path }),
            ...(record.duration !== undefined && { duration: record.duration }),
            ...(record.fps !== undefined && { fps: record.fps }),
            ...(record.resolution && { resolution: record.resolution })
          });
        });
      }

      // Process the CORRECTLY PARSED audio data
      if (audio.length > 0) {
        audio.forEach((record: MCPRecord) => {
          transformedQueries.push({
            queryId: `aud_${record.timestamp || Date.now()}`,
            timestamp: record.timestamp || new Date().toISOString(),
            agentType: 'audio',
            classification: 'AUDIO',
            status: 'completed',
            confidence: 92,
            priority: 'medium',
            reasoning: record.context || 'Audio analysis completed',
            processingTime: 0,
            error: null,
            query: record.query || 'Audio analysis',
            tokens: record.tokens_used || 0,
            result: record.crewai_result || {},
            metadata: record.metadata || {},
            ...(record.file_path && { filePath: record.file_path }),
            ...(record.duration !== undefined && { duration: record.duration }),
            ...(record.format && { format: record.format }),
            ...(record.sample_rate !== undefined && { sampleRate: record.sample_rate }),
            ...(record.channels !== undefined && { channels: record.channels })
          });
        });
      }

      // Sort by timestamp (newest first)
      transformedQueries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log(`📊 Transformed ${transformedQueries.length} records for user ${userId}`);

      res.status(200).json({
        success: true,
        queries: transformedQueries.slice(0, 100), // Limit to last 100 records
        summary: {
          total: transformedQueries.length,
          totalTokens: transformedQueries.reduce((sum, q) => sum + (q.tokens || 0), 0),
          breakdown: {
            images: images.length,
            documents: documents.length,
            videos: videos.length,
            audio: audio.length
          }
        }
      });
      
    } catch (mcpError) {
      console.error('❌ Error fetching from MCP backend:', mcpError);
      
      res.status(502).json({
        success: false,
        queries: [],
        error: 'Failed to fetch data from backend service.',
        summary: { total: 0, totalTokens: 0, breakdown: { images: 0, documents: 0, videos: 0, audio: 0 } },
      });
    }

  } catch (error) {
    console.error('❌ Error getting query history:', error);
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