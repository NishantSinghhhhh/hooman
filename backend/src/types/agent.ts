// backend/types/agent.ts (Updated with MCP properties)

export enum AgentType {
  ROUTER = 'router',
  DOCUMENT = 'document',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  SYNTHESIS = 'synthesis'
}

// Updated AgentConfig interface
export interface AgentConfig {
  name?: string;
  type?: AgentType;
  prompt?: string;
  mcpServerUrl?: string;        // Added for MCP server URL
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useOllama?: boolean;
  openaiApiKey?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  timeout?: number;
  fallbackProcessing?: boolean; // Added for fallback mode
}

export interface IAgentConfig {
  name: string;
  type: AgentType;
  prompt: string;
  mcpServerUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ICrewConfig {
  agents: IAgentConfig[];
  tasks: ITaskConfig[];
}

export interface ITaskConfig {
  description: string;
  agent: AgentType;
  expectedOutput: string;
}

export interface IMCPServerConfig {
  url: string;
  transport: 'sse' | 'stdio';
  name: string;
  description?: string;
}

// Additional interfaces needed for the agent system
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

// Updated ProcessedFile interface
export interface ProcessedFile {
  fileName: string;
  fileType: string;
  status: 'processed' | 'error' | 'skipped';
  analysis?: any;
  response?: string;
  error?: string;
  storageId?: string;        // Added for MCP storage ID
  embeddings?: number[];     // Added for vector embeddings
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

// Updated AudioAnalysis interface
export interface AudioAnalysis {
  fileName: string;
  fileType: string;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  transcription?: string;
  language?: string;
  confidence?: number;
  contentType?: string;      // Added for content classification
  sentiment?: string;        // Added for sentiment analysis
  speakers?: number;         // Added for speaker count
  keywords?: string[];       // Added for keyword extraction
  insights?: string;         // Added for AI insights
  processingMode?: string;   // Added to track processing mode
  embeddings?: number[];     // Added for vector embeddings
  similarContent?: any[];    // Added for similar content results
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
  embeddings?: number[];     // Added for vector embeddings
  objects?: any[];           // Added for detected objects
  faces?: any[];             // Added for face detection
  colors?: any[];            // Added for color analysis
}

export interface DocumentAnalysis {
  fileName: string;
  fileType: string;
  content: string;
  summary?: string;
  wordCount?: number;
  language?: string;
  extractedData?: Record<string, any>;
  embeddings?: number[];     // Added for vector embeddings
  entities?: any[];          // Added for named entity recognition
  topics?: string[];         // Added for topic modeling
  sentiment?: string;        // Added for sentiment analysis
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
  embeddings?: number[];     // Added for vector embeddings
  audioTrack?: AudioAnalysis; // Added for audio component
  keyFrames?: any[];         // Added for key frame analysis
  objects?: any[];           // Added for object detection
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

// MCP-specific interfaces
export interface MCPProcessingResult {
  analysis: any;
  embeddings?: number[];
  storageId?: string;
  processingTime: number;
  serverUsed: string;
}

export interface MCPServerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: string;
  capabilities: string[];
}
export interface MCPProcessResponse {
  success: boolean;
  data: any; // replace with more specific type if possible
  error?: string;
  [key: string]: any;
}
