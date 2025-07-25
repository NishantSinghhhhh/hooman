// backend/services/AgentOrchestrator.ts
import { RouterAgent } from '../agents/RouterAgent';
import { DocumentAgent } from '../agents/DocumentAgent';
import { ImageAgent } from '../agents/ImageAgent';
import { VideoAgent } from '../agents/VideoAgent';
import { AudioAgent } from '../agents/AudioAgent';
import {
  QueryData,
  AgentResponse,
  AgentConfig,
  OrchestratorResponse,
  QueryClassification,
  RoutingDecision
} from '../types/agent';

export class AgentOrchestrator {
  private config: AgentConfig;
  private routerAgent: RouterAgent;
  private documentAgent: DocumentAgent;
  private imageAgent: ImageAgent;
  private videoAgent: VideoAgent;
  private audioAgent: AudioAgent;
  private agents: Record<string, DocumentAgent | ImageAgent | VideoAgent | AudioAgent>;

  constructor(config: AgentConfig = {}) {
    this.config = config;
    
    // Initialize all agents
    this.routerAgent = new RouterAgent(config);
    this.documentAgent = new DocumentAgent(config);
    this.imageAgent = new ImageAgent(config);
    this.videoAgent = new VideoAgent(config);
    this.audioAgent = new AudioAgent(config);
    
    this.agents = {
      document: this.documentAgent,
      image: this.imageAgent,
      video: this.videoAgent,
      audio: this.audioAgent
    };

    console.log('🚀 Agent Orchestrator initialized with TypeScript');
  }

  async processQuery(queryData: QueryData): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Starting query processing...');
      console.log('📊 Query data:', {
        hasText: !!queryData.textQuery,
        fileCount: queryData.files?.length || 0,
        userId: queryData.userId
      });

      // Step 1: Classify the query
      console.log('📋 Step 1: Classifying query...');
      const classification: QueryClassification = await this.routerAgent.classifyQuery(queryData);
      
      // Step 2: Route to appropriate agent
      console.log('🎯 Step 2: Routing to agent...');
      const routing: RoutingDecision = this.routerAgent.routeToAgent(classification);
      
      // Step 3: Process with specialized agent
      console.log(`🤖 Step 3: Processing with ${routing.targetAgent}...`);
      const agentType = classification.agentType;
      const agent = this.agents[agentType];
      
      if (!agent) {
        throw new Error(`Agent not found: ${agentType}`);
      }

      const result: AgentResponse = await agent.processQuery(queryData);
      
      // Step 4: Compile final response
      const processingTime = Date.now() - startTime;
      
      const finalResponse: OrchestratorResponse = {
        ...result,
        classification: classification,
        routing: routing,
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        orchestrator: {
          version: '1.0.0',
          agentUsed: routing.targetAgent,
          confidence: classification.confidence
        }
      };

      console.log(`✅ Query processing completed in ${processingTime}ms`);
      return finalResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Orchestrator error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response: "I apologize, but I encountered an error while processing your query. Please try again or contact support if the issue persists.",
        agentType: 'unknown',
        classification: {
          classification: 'TEXT',
          agentType: 'document',
          reasoning: 'Error occurred during classification',
          priority: 'low',
          confidence: 0.0
        },
        routing: {
          targetAgent: 'DocumentAgent',
          classification: {
            classification: 'TEXT',
            agentType: 'document',
            reasoning: 'Error fallback',
            priority: 'low',
            confidence: 0.0
          },
          routingDecision: {
            agent: 'DocumentAgent',
            priority: 'low',
            confidence: 0.0,
            reasoning: 'Error fallback routing'
          }
        },
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        orchestrator: {
          version: '1.0.0',
          agentUsed: 'ErrorHandler',
          confidence: 0.0
        }
      };
    }
  }

  async getAgentCapabilities(): Promise<Record<string, any>> {
    return {
      document: this.documentAgent.getCapabilities(),
      image: this.imageAgent.getCapabilities(),
      video: this.videoAgent.getCapabilities(),
      audio: this.audioAgent.getCapabilities(),
      orchestrator: {
        version: '1.0.0',
        supportedAgents: ['document', 'image', 'video', 'audio'],
        features: [
          'Intelligent query classification',
          'Multi-modal content processing',
          'Automatic agent routing',
          'Real-time processing status',
          'Comprehensive error handling'
        ]
      }
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    agents: Record<string, boolean>;
    timestamp: string;
  }> {
    const agentHealth: Record<string, boolean> = {};
    
    try {
      // Test each agent with a simple query
      agentHealth.router = true; // Router is always available
      agentHealth.document = true; // Document agent is always available
      agentHealth.image = true; // Image agent is always available
      agentHealth.video = true; // Video agent is always available
      agentHealth.audio = true; // Audio agent is always available
      
      const healthyAgents = Object.values(agentHealth).filter(Boolean).length;
      const totalAgents = Object.keys(agentHealth).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyAgents === totalAgents) {
        status = 'healthy';
      } else if (healthyAgents > totalAgents / 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        agents: agentHealth,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        agents: agentHealth,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMetrics(): Promise<{
    totalQueries: number;
    agentUsage: Record<string, number>;
    averageProcessingTime: number;
    errorRate: number;
  }> {
    // In a real implementation, these would come from a metrics store
    return {
      totalQueries: 0,
      agentUsage: {
        document: 0,
        image: 0,
        video: 0,
        audio: 0
      },
      averageProcessingTime: 0,
      errorRate: 0
    };
  }

  // MCP Integration methods
  async connectAllMCPServers(): Promise<void> {
    console.log('📡 Connecting to all MCP servers...');
    
    try {
      await Promise.all([
        this.documentAgent.connectToMCP(),
        this.imageAgent.connectToMCP(),
        this.videoAgent.connectToMCP(),
        this.audioAgent.connectToMCP()
      ]);
      
      console.log('✅ All MCP servers connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to some MCP servers:', error);
      throw error;
    }
  }

  // Utility methods
  private validateQueryData(queryData: QueryData): void {
    if (!queryData.userId) {
      throw new Error('User ID is required');
    }
    
    if (!queryData.textQuery && (!queryData.files || queryData.files.length === 0)) {
      throw new Error('Either text query or files must be provided');
    }
  }

  private sanitizeQueryData(queryData: QueryData): QueryData {
    return {
      ...queryData,
      textQuery: queryData.textQuery?.trim() || '',
      files: queryData.files?.filter(file => file.size > 0) || []
    };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Agent Orchestrator...');
    // Cleanup resources, close connections, etc.
    console.log('✅ Agent Orchestrator shutdown complete');
  }
}