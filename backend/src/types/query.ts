import { Types } from 'mongoose';
  // src/types/query.ts
  export enum QueryType {
    TEXT = 'text',
    IMAGE = 'image',
    AUDIO = 'audio',
    VIDEO = 'video',
    DOCUMENT = 'document'
  }
  
  export enum AgentType {
    ROUTER = 'router',
    DOCUMENT = 'document',
    IMAGE = 'image',
    AUDIO = 'audio',
    VIDEO = 'video',
    SYNTHESIS = 'synthesis'
  }
  
  export interface IQuery {
    _id: string | Types.ObjectId;    // Accept either string or ObjectId
    userId: string | Types.ObjectId; // Accept either string or ObjectId
    queryType: QueryType;
    originalFilename?: string;
    filePath?: string;
    queryText?: string;
    agentUsed?: AgentType;
    result?: string;
    metadata?: Record<string, any>;
    processingTime?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface IQueryRequest {
    queryType: QueryType;
    queryText?: string;
    file?: Express.Multer.File;
  }
  
  export interface IQueryResponse {
    id: string;
    queryType: QueryType;
    result: string;
    agentUsed: AgentType;
    processingTime: number;
    status: string;
    createdAt: Date;
  }
  