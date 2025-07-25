// backend/types/agent.ts
export interface QueryData {
    textQuery?: string;
    files?: UploadedFile[];
    userId: string;
    queryId?: string;
    metadata?: Record<string, any>;
  }
  
  export interface UploadedFile {
    filename: string;
    path: string;
    mimetype: string;
    size: number;
    fieldname?: string;
    originalname?: string;
    encoding?: string;
    buffer?: Buffer;
  }
  
  export interface QueryClassification {
    classification: 'TEXT' | 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
    agentType: 'document' | 'image' | 'video' | 'audio';
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    confidence: number;
    fileCount?: number;
    hasTextQuery?: boolean;
    timestamp?: string;
  }
  
  export interface RoutingDecision {
    targetAgent: string;
    classification: QueryClassification;
    routingDecision: {
      agent: string;
      priority: string;
      confidence: number;
      reasoning: string;
    };
  }
  
  export interface AgentResponse {
    success: boolean;
    response: string;
    agentType: string;
    processedFiles?: ProcessedFile[];
    capabilities?: AgentCapabilities;
    metadata?: Record<string, any>;
    error?: string;
  }
  
  export interface ProcessedFile {
    fileName: string;
    fileType: string;
    status: 'processed' | 'error' | 'skipped';
    analysis?: any;
    response?: string;
    error?: string;
  }
  
  export interface AgentCapabilities {
    agentType: string;
    supportedFormats: string[];
    capabilities: string[];
    maxFileSize?: string;
    processingTime?: string;
    accuracy?: string;
    languages?: string[];
  }
  
  export interface ImageAnalysis {
    fileName: string;
    fileType: string;
    metadata: {
      width: number;
      height: number;
      format: string;
      fileSize: number;
      hasAlpha?: boolean;
      channels?: number;
    };
    ocrText: string;
    description: string;
    features: string[];
  }
  
  export interface DocumentAnalysis {
    fileName: string;
    fileType: string;
    content: string;
    summary?: string;
    wordCount?: number;
    language?: string;
    extractedData?: Record<string, any>;
  }
  
  export interface VideoAnalysis {
    fileName: string;
    fileType: string;
    duration?: number;
    resolution?: string;
    frameRate?: number;
    transcription?: string;
    scenes?: any[];
    thumbnail?: string;
  }
  
  export interface AudioAnalysis {
    fileName: string;
    fileType: string;
    duration?: number;
    sampleRate?: number;
    channels?: number;
    transcription?: string;
    language?: string;
    confidence?: number;
  }
  
  export interface AgentConfig {
    useOllama?: boolean;
    openaiApiKey?: string;
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }
  
  export interface OrchestratorResponse extends AgentResponse {
    classification: QueryClassification;
    routing: RoutingDecision;
    processingTime: number;
    timestamp: string;
    orchestrator: {
      version: string;
      agentUsed: string;
      confidence: number;
    };
  }