
// Define interfaces for the data structures
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
    images: MCPRecord[];
    documents: MCPRecord[];
    videos: MCPRecord[];
    audio: MCPRecord[];
    activity_summary: any;
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
  