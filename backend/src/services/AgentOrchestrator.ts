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
   * Classify query and send to MCP backend
   */
  async processQuery(queryData: QueryData): Promise<QueryClassification> {
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

      // Step 5: Send classification to MCP backend
      await this.sendClassificationToMCP(classification, queryData, routing);

      return classification;

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
      
      // Also send fallback to MCP
      try {
        await this.sendClassificationToMCP(fallbackClassification, queryData, null);
      } catch (mcpError) {
        console.error('❌ Failed to send fallback to MCP:', mcpError);
      }
      
      return fallbackClassification;
    }
  }

  private async sendTextRequest(queryData: QueryData, classification: QueryClassification): Promise<void> {
    const payload = {
      query: queryData.textQuery || '',
      user_id: queryData.userId
    };
  
    const response = await fetch(`${this.mcpBackendUrl}/process-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  
    if (response.ok) {
      const result = await response.json() as { tokens?: number; [key: string]: any };
      console.log('✅ Text processed by Python backend');
      console.log(`📨 Result:`, result);
      
      // Update token count if response contains token info
      if (result.tokens && queryData.userId) {
        await AnalyticsController.updateTokenCount(queryData.userId, 'document', result.tokens);
      }
    } else {
      console.error(`❌ Python backend error: ${response.status}`);
    }
  }
  
  private async sendImageRequest(queryData: QueryData, classification: QueryClassification): Promise<void> {
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
  
    const response = await fetch(`${this.mcpBackendUrl}/process-image`, {
      method: 'POST',
      body: formData
    });
  
    if (response.ok) {
      const result = await response.json() as { tokens?: number; [key: string]: any };
      console.log('✅ Image processed by Python backend');
      console.log(`📨 Result:`, result);
      
      // Update token count if response contains token info
      if (result.tokens && queryData.userId) {
        await AnalyticsController.updateTokenCount(queryData.userId, 'image', result.tokens);
      }
    } else {
      console.error(`❌ Python backend error: ${response.status}`);
    }
  }

  private async sendAudioRequest(queryData: QueryData, classification: QueryClassification): Promise<void> {
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
    
    const response = await fetch(`${this.mcpBackendUrl}/process-audio`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json() as { tokens?: number; [key: string]: any };
      console.log('✅ Audio processed by Python backend');
      console.log(`📨 Result:`, result);
      
      // Update token count if response contains token info
      if (result.tokens && queryData.userId) {
        await AnalyticsController.updateTokenCount(queryData.userId, 'audio', result.tokens);
      }
    } else {
      console.error(`❌ Python backend error: ${response.status}`);
    }
  }
  
  private async sendVideoRequest(queryData: QueryData, classification: QueryClassification): Promise<void> {
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
    
    const response = await fetch(`${this.mcpBackendUrl}/process-video`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json() as { tokens?: number; [key: string]: any };
      console.log('✅ Video processed by Python backend');
      console.log(`📨 Result:`, result);
      
      // Update token count if response contains token info
      if (result.tokens && queryData.userId) {
        await AnalyticsController.updateTokenCount(queryData.userId, 'video', result.tokens);
      }
    } else {
      console.error(`❌ Python backend error: ${response.status}`);
    }
  }
  
  private async sendDocumentRequest(queryData: QueryData, classification: QueryClassification): Promise<void> {
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
    
    const response = await fetch(`${this.mcpBackendUrl}/process-document`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json() as { tokens?: number; [key: string]: any };
      console.log('✅ Document processed by Python backend');
      console.log(`📨 Result:`, result);
      
      // Update token count if response contains token info
      if (result.tokens && queryData.userId) {
        await AnalyticsController.updateTokenCount(queryData.userId, 'document', result.tokens);
      }
    } else {
      console.error(`❌ Python backend error: ${response.status}`);
    }
  }

  private async sendClassificationToMCP(
    classification: QueryClassification, 
    queryData: QueryData, 
    routing: RoutingDecision | null
  ): Promise<void> {
    try {
      console.log('📡 Sending to Python MCP backend...');
  
      // Only file-based queries go to specialist endpoints
      if (queryData.files && queryData.files.length > 0) {
        switch (classification.agentType) {
          case 'image':
            await this.sendImageRequest(queryData, classification);
            return;
          case 'video':
            await this.sendVideoRequest(queryData, classification);
            return;
          case 'audio':
            await this.sendAudioRequest(queryData, classification);
            return;
          case 'document':
          default:
            await this.sendDocumentRequest(queryData, classification);
            return;
        }
      } else {
        // Pure text queries
        await this.sendTextRequest(queryData, classification);
        return;
      }
  
    } catch (error) {
      console.error('❌ Failed to send to Python backend:', error);
    }
  }
  
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    service: string;
    timestamp: string;
    mcpBackend?: string;
  }> {
    try {
      // Test classification with dummy data
      const testQuery: QueryData = {
        textQuery: 'health check test',
        userId: 'health-check',
        files: []
      };

      const classification = await this.processQuery(testQuery);
      
      // Test MCP backend connectivity
      let mcpStatus = 'unknown';
      try {
        const mcpResponse = await fetch(`${this.mcpBackendUrl}/health`);
        mcpStatus = mcpResponse.ok ? 'healthy' : 'unhealthy';
      } catch {
        mcpStatus = 'unreachable';
      }
      
      return {
        status: classification.confidence > 0 ? 'healthy' : 'unhealthy',
        service: 'classification',
        timestamp: new Date().toISOString(),
        mcpBackend: mcpStatus
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'classification',
        timestamp: new Date().toISOString(),
        mcpBackend: 'error'
      };
    }
  }
}