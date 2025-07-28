// backend/services/AgentOrchestrator.ts
import { RouterAgent } from '../agents/RouterAgent';
import { AnalyticsController } from '../controllers/analyticsController';
import {
  QueryData,
  AgentConfig,
  QueryClassification,
  RoutingDecision
} from '../types/agent';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

export class AgentOrchestrator {
  private config: AgentConfig;
  private routerAgent: RouterAgent;
  private mcpBackendUrl: string;

  constructor(config: AgentConfig = {}) {
    this.config = config;
    this.routerAgent = new RouterAgent(config);
    this.mcpBackendUrl = process.env.MCP_BACKEND_URL || 'http://localhost:8001';
    console.log('🚀 Agent Orchestrator initialized - Classification mode');
    console.log(`📡 MCP Backend URL: ${this.mcpBackendUrl}`);
  }

  /**
   * Process query and return both classification and result data
   */
  async processQuery(queryData: QueryData): Promise<{
    classification: QueryClassification;
    result: any;
    processing_time: number;
  }> {
    const startTime = Date.now();
    console.log('🎯 Starting query classification...');
    console.log('📊 Query data:', {
      hasText: !!queryData.textQuery,
      fileCount: queryData.files?.length || 0,
      userId: queryData.userId
    });

    try {
      // Step 1: Classify the query using RouterAgent
      const classification: QueryClassification = await this.routerAgent.classifyQuery(queryData);
      
      // Step 2: Get routing decision
      const routing: RoutingDecision = this.routerAgent.routeToAgent(classification);
      
      // Step 3: Log the classification result
      console.log('📋 CLASSIFICATION RESULT:');
      console.log(`   🎯 Agent Type: ${classification.agentType}`);
      console.log(`   📂 Classification: ${classification.classification}`);
      console.log(`   🔍 Reasoning: ${classification.reasoning}`);
      console.log(`   📊 Confidence: ${Math.round(classification.confidence * 100)}%`);
      console.log(`   ⚡ Priority: ${classification.priority}`);
      console.log('─'.repeat(50));

      // Step 4: Update analytics - request count
      if (queryData.userId) {
        await AnalyticsController.updateRequestCount(queryData.userId, classification.agentType);
      }

      // Step 5: Send classification to MCP backend and get result
      const mcpResult = await this.sendClassificationToMCP(classification, queryData, routing);
      
      const processingTime = Date.now() - startTime;
      
      return {
        classification,
        result: mcpResult,
        processing_time: processingTime
      };

    } catch (error) {
      console.error('❌ Classification error:', error);
      
      // Fallback classification
      const fallbackClassification: QueryClassification = {
        classification: 'TEXT',
        agentType: 'document',
        reasoning: `Classification failed: ${error instanceof Error ? error.message : String(error)}`,
        priority: 'low',
        confidence: 0.1,
        hasTextQuery: !!queryData.textQuery,
        fileCount: queryData.files?.length || 0,
        timestamp: new Date().toISOString()
      };

      console.log('📋 FALLBACK CLASSIFICATION:');
      console.log(`   🎯 Agent Type: ${fallbackClassification.agentType}`);
      console.log(`   🔍 Reasoning: ${fallbackClassification.reasoning}`);
      
      // Update analytics for fallback too
      if (queryData.userId) {
        await AnalyticsController.updateRequestCount(queryData.userId, fallbackClassification.agentType);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Try to send fallback to MCP, but don't fail if it doesn't work
      let fallbackResult;
      try {
        fallbackResult = await this.sendClassificationToMCP(fallbackClassification, queryData, null);
      } catch (mcpError) {
        console.error('❌ Failed to send fallback to MCP:', mcpError);
        fallbackResult = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          query: queryData.textQuery,
          file_processed: (queryData.files && queryData.files.length > 0),
          processing_time: processingTime,
          result: {
            primary_analysis: 'Processing failed due to classification error.',
            enhanced_response: 'Unable to process the query at this time. Please try again.',
            technical_details: {
              model_used: 'fallback',
              tokens_used: 0,
              processing_time: `${processingTime}ms`,
              enhancement_agents: []
            },
            query_details: {
              original_query: queryData.textQuery,
              query_type: 'error'
            },
            status: {
              openai_analysis: 'failed',
              crew_enhancement: 'failed',
              overall: 'error'
            }
          }
        };
      }
      
      return {
        classification: fallbackClassification,
        result: fallbackResult,
        processing_time: processingTime
      };
    }
  }

  private async sendTextRequest(queryData: QueryData, classification: QueryClassification): Promise<Response> {
    const payload = {
      query: queryData.textQuery || '',
      user_id: queryData.userId
    };

    console.log('📤 Sending text request to MCP backend...');
    return await fetch(`${this.mcpBackendUrl}/process-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  
  private async sendImageRequest(queryData: QueryData, classification: QueryClassification): Promise<Response> {
    const formData = new FormData();
    formData.append('query', queryData.textQuery || '');
    
    if (queryData.userId) {
      formData.append('user_id', queryData.userId);
    }

    if (queryData.files && queryData.files.length > 0) {
      const file = queryData.files[0];
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(file.path);
      const blob = new Blob([fileBuffer], { type: file.mimetype });
      formData.append('file', blob, file.filename);
      console.log(`📁 Processing image file: ${file.filename} (${file.mimetype})`);
    }

    console.log('📤 Sending image request to MCP backend...');
    return await fetch(`${this.mcpBackendUrl}/process-image`, {
      method: 'POST',
      body: formData
    });
  }

  private async sendAudioRequest(queryData: QueryData, classification: QueryClassification): Promise<Response> {
    const formData = new FormData();
    formData.append('query', queryData.textQuery || '');
    if (queryData.userId) {
      formData.append('user_id', queryData.userId);
    }
    if (queryData.files && queryData.files.length > 0) {
      const file = queryData.files[0];
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(file.path);
      const blob = new Blob([fileBuffer], { type: file.mimetype });
      formData.append('file', blob, file.filename);
      console.log(`📁 Processing audio file: ${file.filename} (${file.mimetype})`);
    }
    
    console.log('📤 Sending audio request to MCP backend...');
    return await fetch(`${this.mcpBackendUrl}/process-audio`, {
      method: 'POST',
      body: formData
    });
  }
  
  private async sendVideoRequest(queryData: QueryData, classification: QueryClassification): Promise<Response> {
    const formData = new FormData();
    formData.append('query', queryData.textQuery || '');
    if (queryData.userId) {
      formData.append('user_id', queryData.userId);
    }
    if (queryData.files && queryData.files.length > 0) {
      const file = queryData.files[0];
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(file.path);
      const blob = new Blob([fileBuffer], { type: file.mimetype });
      formData.append('file', blob, file.filename);
      console.log(`📁 Processing video file: ${file.filename} (${file.mimetype})`);
    }
    
    console.log('📤 Sending video request to MCP backend...');
    return await fetch(`${this.mcpBackendUrl}/process-video`, {
      method: 'POST',
      body: formData
    });
  }
  
  private async sendDocumentRequest(queryData: QueryData, classification: QueryClassification): Promise<Response> {
    const formData = new FormData();
    formData.append('query', queryData.textQuery || '');
    if (queryData.userId) {
      formData.append('user_id', queryData.userId);
    }
    if (queryData.files && queryData.files.length > 0) {
      const file = queryData.files[0];
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(file.path);
      const blob = new Blob([fileBuffer], { type: file.mimetype });
      formData.append('file', blob, file.filename);
      console.log(`📁 Processing document file: ${file.filename} (${file.mimetype})`);
    }
    
    console.log('📤 Sending document request to MCP backend...');
    return await fetch(`${this.mcpBackendUrl}/process-document`, {
      method: 'POST',
      body: formData
    });
  }

  private async sendClassificationToMCP(
    classification: QueryClassification, 
    queryData: QueryData, 
    routing: RoutingDecision | null
  ): Promise<any> {
    try {
      console.log('📡 Sending to Python MCP backend...');

      let response: Response;
      
      // Only file-based queries go to specialist endpoints
      if (queryData.files && queryData.files.length > 0) {
        switch (classification.agentType) {
          case 'image':
            response = await this.sendImageRequest(queryData, classification);
            break;
          case 'video':
            response = await this.sendVideoRequest(queryData, classification);
            break;
          case 'audio':
            response = await this.sendAudioRequest(queryData, classification);
            break;
          case 'document':
          default:
            response = await this.sendDocumentRequest(queryData, classification);
            break;
        }
      } else {
        // Pure text queries
        response = await this.sendTextRequest(queryData, classification);
      }

      if (response.ok) {
        const result = await response.json() as any;
        console.log('✅ MCP Backend processed successfully');
        console.log(`📨 Result structure:`, {
          success: result.success,
          hasResult: !!result.result,
          processingTime: result.processing_time,
          fileProcessed: result.file_processed
        });
        
        // Update token count if response contains token info
        if (result.result?.technical_details?.tokens_used && queryData.userId) {
          await AnalyticsController.updateTokenCount(
            queryData.userId, 
            classification.agentType, 
            result.result.technical_details.tokens_used
          );
        }
        
        return result;
      } else {
        const errorText = await response.text();
        console.error(`❌ Python backend error: ${response.status} - ${errorText}`);
        throw new Error(`MCP Backend error: ${response.status} - ${errorText}`);
      }

    } catch (error) {
      console.error('❌ Failed to send to Python backend:', error);
      throw error;
    }
  }
  
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    service: string;
    timestamp: string;
    mcpBackend?: string;
    details?: any;
  }> {
    try {
      // Test classification with dummy data
      const testQuery: QueryData = {
        textQuery: 'health check test',
        userId: 'health-check',
        files: []
      };

      const result = await this.processQuery(testQuery);
      
      // Test MCP backend connectivity
      let mcpStatus = 'unknown';
      let mcpDetails = {};
      try {
        const mcpResponse = await fetch(`${this.mcpBackendUrl}/health`, {
          method: 'GET',
          // timeout: 5000
        });
        mcpStatus = mcpResponse.ok ? 'healthy' : 'unhealthy';
        if (mcpResponse.ok) {
          // mcpDetails = await mcpResponse.json();
        }
      } catch (mcpError) {
        mcpStatus = 'unreachable';
        mcpDetails = { error: mcpError instanceof Error ? mcpError.message : String(mcpError) };
      }
      
      return {
        status: result.classification.confidence > 0 ? 'healthy' : 'unhealthy',
        service: 'AgentOrchestrator',
        timestamp: new Date().toISOString(),
        mcpBackend: mcpStatus,
        details: {
          classification: {
            confidence: result.classification.confidence,
            agentType: result.classification.agentType
          },
          mcpBackend: mcpDetails,
          processingTime: result.processing_time
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'AgentOrchestrator',
        timestamp: new Date().toISOString(),
        mcpBackend: 'error',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}