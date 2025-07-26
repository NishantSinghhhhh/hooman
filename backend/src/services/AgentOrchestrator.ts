// backend/services/AgentOrchestrator.ts
import { RouterAgent } from '../agents/RouterAgent';
import {
  QueryData,
  AgentConfig,
  QueryClassification,
  RoutingDecision
} from '../types/agent';
import fetch from 'node-fetch'; // Add this import

export class AgentOrchestrator {
  private config: AgentConfig;
  private routerAgent: RouterAgent;
  private mcpBackendUrl: string;

  constructor(config: AgentConfig = {}) {
    this.config = config;
    this.routerAgent = new RouterAgent(config);
    this.mcpBackendUrl = process.env.MCP_BACKEND_URL || 'http://localhost:8000';
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

      // Step 4: Send classification to MCP backend
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
      
      // Also send fallback to MCP
      try {
        await this.sendClassificationToMCP(fallbackClassification, queryData, null);
      } catch (mcpError) {
        console.error('❌ Failed to send fallback to MCP:', mcpError);
      }
      
      return fallbackClassification;
    }
  }

// In AgentOrchestrator.ts, update the sendClassificationToMCP method:

private async sendClassificationToMCP(
  classification: QueryClassification, 
  queryData: QueryData, 
  routing: RoutingDecision | null
): Promise<void> {
  try {
    console.log('📡 Sending classification to MCP backend...');
    
    const payload = {
      classification,
      queryData,
      routing,
      timestamp: new Date().toISOString(),
      source: 'typescript_backend'
    };

    // Route to specific agent endpoint based on classification
    let endpoint = '/process-classification';
    if (classification.agentType === 'image') {
      endpoint = '/process-image';
      console.log('🖼️ Routing to Image Agent for Pixeltable processing');
    }

    const response = await fetch(`${this.mcpBackendUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Successfully processed by MCP backend');
      // console.log(`📨 Result: ${result.message || result.response}`);
    } else {
      console.error(`❌ MCP backend error: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ Failed to send to MCP backend:', error);
  }
}

  /**
   * Send files to MCP backend for processing
   */
  private async sendFilesToMCP(agentType: string, queryData: QueryData): Promise<void> {
    try {
      console.log('📁 Sending files to MCP backend for processing...');
      
      // For now, just send file metadata
      // Later we can send actual file data if needed
      const filePayload = {
        agentType: agentType,
        userId: queryData.userId,
        queryText: queryData.textQuery || '',
        files: queryData.files?.map(file => ({
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path
        })) || [],
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.mcpBackendUrl}/process-files-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filePayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ File metadata sent to MCP backend successfully');
      } else {
        console.error(`❌ Failed to send files to MCP: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Error sending files to MCP:', error);
    }
  }

  /**
   * Health check for classification service
   */
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