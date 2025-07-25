// backend/controllers/queryController.ts
import { Request, Response } from 'express';
import { AgentOrchestrator } from '../services/AgentOrchestrator';
import { QueryData, OrchestratorResponse } from '../types/agent';
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


const queryResults: Map<string, OrchestratorResponse> = new Map();
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

    this.initializeMCP();
  }

  private async initializeMCP(): Promise<void> {
    try {
      await this.orchestrator.connectAllMCPServers();
      console.log('✅ MCP servers initialized successfully');
    } catch (error) {
      console.warn('⚠️ Some MCP servers failed to initialize:', error);
    }
  }

  public uploadMiddleware = upload.array('files', 10);

// backend/controllers/queryController.ts

public submitQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ --- Start of Logging ---
    console.log("-----------------------------------------");
    console.log("📡 INCOMING QUERY REQUEST RECEIVED 📡");
    console.log("-----------------------------------------");
    console.log("Request Body (req.body):", req.body);
    console.log("Uploaded Files (req.files):", req.files);
    console.log("Authenticated User (req.user):", req.user);
    console.log("-----------------------------------------");
    // ✅ --- End of Logging ---

 const { textQuery, userId } = req.body;
    const files = req.files as Express.Multer.File[];

    // ✅ FIX: Check against req.user._id and convert it to a string
    if (!req.user || req.user._id.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized: User ID mismatch'
      });
      return;
    }

    // Validate presence of text or files
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
      files:
        files?.map(file => ({
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
    try {
      console.log(`🔄 Processing query ${queryId}...`);

      // This internally will:
      // 1) Classify (document, image, video, audio)
      // 2) Route query to the appropriate agent
      // 3) Execute agent processing
      const result = await this.orchestrator.processQuery(queryData);

      queryResults.set(queryId, {
        ...result,
        metadata: {
          ...result.metadata,
          queryId,
          userId: queryData.userId,
        }
      });
      queryStatus.set(queryId, result.success ? 'completed' : 'error');

      console.log(`✅ Query ${queryId} completed successfully`);

      this.cleanupFiles(queryData);
    } catch (error) {
      console.error(`❌ Query ${queryId} processing failed:`, error);

      queryStatus.set(queryId, 'error');
      queryResults.set(queryId, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response: 'Processing failed due to an internal error',
        agentType: 'error',
        classification: {
          classification: 'TEXT',
          agentType: 'document',
          reasoning: 'Error during processing',
          priority: 'low',
          confidence: 0.0,
        },
        routing: {
          targetAgent: 'ErrorHandler',
          classification: {
            classification: 'TEXT',
            agentType: 'document',
            reasoning: 'Error fallback',
            priority: 'low',
            confidence: 0.0,
          },
          routingDecision: {
            agent: 'ErrorHandler',
            priority: 'low',
            confidence: 0.0,
            reasoning: 'Error occurred',
          },
        },
        processingTime: 0,
        timestamp: new Date().toISOString(),
        orchestrator: {
          version: '1.0.0',
          agentUsed: 'ErrorHandler',
          confidence: 0.0,
        },
        metadata: {
          queryId,
          userId: queryData.userId,
          error: true,
        },
      });

      this.cleanupFiles(queryData);
    }
  }

  private cleanupFiles(queryData: QueryData): void {
    queryData.files?.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.warn(`Failed to cleanup file: ${file.path}`, err);
        }
      });
    });
  }

  private estimateProcessingTime(queryData: QueryData): string {
    const fileCount = queryData.files?.length || 0;
    const hasVideo = queryData.files?.some(f => f.mimetype.startsWith('video/'));
    const hasAudio = queryData.files?.some(f => f.mimetype.startsWith('audio/'));

    if (hasVideo) return '30-120 seconds';
    if (hasAudio) return '15-60 seconds';
    if (fileCount > 5) return '20-45 seconds';
    if (fileCount > 0) return '5-20 seconds';
    return '2-10 seconds';
  }
}

export default QueryController;
