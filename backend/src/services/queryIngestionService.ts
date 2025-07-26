// backend/services/queryIngestionService.ts
import Query from '@/models/Query';
import { Types } from 'mongoose';
import { QueryType, AgentType } from '@/types/query';
import { AgentResponse, QueryData } from '@/types/agent';

export class QueryIngestionService {
  /**
   * Store a new query with results
   */
  static async storeQuery(
    userId: string,
    queryData: QueryData,
    agentResponse: AgentResponse,
    processingTime: number
  ): Promise<any> {
    try {
      // Get primary file info
      const primaryFile = queryData.files?.[0];
      
      // Prepare metadata
      const metadata = {
        processedFiles: agentResponse.processedFiles || [],
        capabilities: agentResponse.capabilities,
        errorDetails: agentResponse.success ? null : agentResponse.error,
        totalFiles: queryData.files?.length || 0,
        successfulFiles: agentResponse.processedFiles?.filter(f => f.status === 'processed').length || 0,
        failedFiles: agentResponse.processedFiles?.filter(f => f.status === 'error').length || 0,
        ...agentResponse.metadata,
      };

      const queryRecord = {
        userId: new Types.ObjectId(userId),
        queryType: QueryIngestionService.getQueryType(agentResponse.agentType),
        originalFilename: primaryFile?.filename || null,
        filePath: primaryFile?.path || null,
        queryText: queryData.textQuery || '',
        agentUsed: QueryIngestionService.getAgentType(agentResponse.agentType),
        result: agentResponse.response,
        metadata,
        processingTime,
        status: agentResponse.success ? 'completed' : 'failed'
      };

      const savedQuery = await Query.create(queryRecord);
      console.log(`✅ Query stored successfully: ${savedQuery._id}`);
      
      return savedQuery;
    } catch (error) {
      console.error('❌ Error storing query:', error);
      throw new Error(`Failed to store query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an existing query with results
   */
  static async updateQuery(
    queryId: string,
    agentResponse: AgentResponse,
    processingTime: number
  ): Promise<any> {
    try {
      const updateData = {
        result: agentResponse.response,
        status: agentResponse.success ? 'completed' : 'failed',
        processingTime,
        metadata: {
          processedFiles: agentResponse.processedFiles || [],
          capabilities: agentResponse.capabilities,
          errorDetails: agentResponse.success ? null : agentResponse.error,
          successfulFiles: agentResponse.processedFiles?.filter(f => f.status === 'processed').length || 0,
          failedFiles: agentResponse.processedFiles?.filter(f => f.status === 'error').length || 0,
          updatedAt: new Date(),
          ...agentResponse.metadata,
        }
      };

      const updatedQuery = await Query.findByIdAndUpdate(
        queryId,
        updateData,
        { new: true }
      );

      if (!updatedQuery) {
        throw new Error(`Query with ID ${queryId} not found`);
      }

      console.log(`✅ Query updated successfully: ${updatedQuery._id}`);
      return updatedQuery;
    } catch (error) {
      console.error('❌ Error updating query:', error);
      throw error;
    }
  }

  // Helper methods
  private static getQueryType(agentType: string): QueryType {
    switch (agentType.toLowerCase()) {
      case 'audio':
        return QueryType.AUDIO;
      case 'image':
        return QueryType.IMAGE;
      case 'video':
        return QueryType.VIDEO;
      case 'document':
        return QueryType.DOCUMENT;
      default:
        return QueryType.TEXT;
    }
  }

  private static getAgentType(agentType: string): AgentType {
    switch (agentType.toLowerCase()) {
      case 'audio':
        return AgentType.AUDIO;
      case 'image':
        return AgentType.IMAGE;
      case 'video':
        return AgentType.VIDEO;
      case 'document':
        return AgentType.DOCUMENT;
      case 'synthesis':
        return AgentType.SYNTHESIS;
      default:
        return AgentType.ROUTER;
    }
  }
}