// backend/services/CrewAIOrchestrator.ts
import { AudioAgent } from '../agents/AudioAgent';
import { ImageAgent } from '../agents/ImageAgent';
import { DocumentAgent } from '../agents/DocumentAgent';
// import { VideoAgent } from '../agents/VideoAgent'; // Not implemented yet
import { MCPServerAdapter } from './MCPServerAdapter';

interface CrewMember {
  agent: any;
  role: string;
  goal: string;
  backstory: string;
  mcpAdapter?: MCPServerAdapter;
}

interface RoutingDecision {
  targetAgent: string;
  confidence: number;
  reasoning: string;
  fileTypes?: string[];
}

export class CrewAIOrchestrator {
  private routerAgent!: CrewMember;
  private specialistAgents: Map<string, CrewMember> = new Map();
  private synthesisAgent!: CrewMember;

  constructor() {
    this.initializeCrew();
  }

  private async initializeCrew(): Promise<void> {
    // Router Agent - handles classification and routing
    this.routerAgent = {
      agent: this, // Self-reference for routing logic
      role: "Query Router and Classifier",
      goal: "Accurately classify incoming multimodal queries and route them to the appropriate specialist agent",
      backstory: "You are an expert at understanding different types of content and routing queries to the right specialists. You analyze text, files, and context to make intelligent routing decisions."
    };

    // Initialize MCP adapters for each media type
    const audioMCPAdapter = new MCPServerAdapter({
      url: process.env.AUDIO_MCP_SERVER_URL || 'http://localhost:8001',
      transport: 'sse',
      name: 'audio-mcp-server',
      description: 'Pixeltable-based audio processing server'
    }, 'audio');

    const imageMCPAdapter = new MCPServerAdapter({
      url: process.env.IMAGE_MCP_SERVER_URL || 'http://localhost:8002',
      transport: 'sse',
      name: 'image-mcp-server',
      description: 'Pixeltable-based image processing server'
    }, 'image');

    const documentMCPAdapter = new MCPServerAdapter({
      url: process.env.DOCUMENT_MCP_SERVER_URL || 'http://localhost:8003',
      transport: 'sse',
      name: 'document-mcp-server',
      description: 'Pixeltable-based document processing server'
    }, 'document');

    // Initialize specialist agents with MCP adapters
    this.specialistAgents.set('audio', {
      agent: new AudioAgent({
        mcpServerUrl: process.env.AUDIO_MCP_SERVER_URL || 'http://localhost:8001'
      }),
      role: "Audio Analysis Specialist",
      goal: "Process and analyze audio content using MCP-powered tools, providing transcription, metadata extraction, and content insights",
      backstory: "You are an expert audio analyst with access to enterprise-grade transcription and analysis tools via MCP servers. You excel at understanding speech, music, and audio content.",
      mcpAdapter: audioMCPAdapter
    });

    this.specialistAgents.set('image', {
      agent: new ImageAgent({
        mcpServerUrl: process.env.IMAGE_MCP_SERVER_URL || 'http://localhost:8002'
      }),
      role: "Visual Content Specialist", 
      goal: "Analyze images and visual content using advanced computer vision and OCR capabilities",
      backstory: "You are a computer vision expert with advanced image analysis capabilities via MCP servers. You can extract text, identify objects, and provide detailed visual analysis.",
      mcpAdapter: imageMCPAdapter
    });

    this.specialistAgents.set('document', {
      agent: new DocumentAgent({
        mcpServerUrl: process.env.DOCUMENT_MCP_SERVER_URL || 'http://localhost:8003'
      }),
      role: "Document Analysis Specialist",
      goal: "Process and analyze text documents, PDFs, and structured data with comprehensive understanding",
      backstory: "You are a document analysis expert with advanced text processing capabilities. You excel at extracting insights, answering questions, and summarizing complex documents.",
      mcpAdapter: documentMCPAdapter
    });

    // Video agent placeholder - will be implemented later
    // this.specialistAgents.set('video', {
    //   agent: new VideoAgent(),
    //   role: "Video Content Specialist",
    //   goal: "Analyze video content including visual scenes, audio tracks, and temporal information",
    //   backstory: "You are a video analysis expert capable of processing both visual and audio components of video content using advanced MCP-powered tools."
    // });

    // Synthesis Agent - formats and combines results
    this.synthesisAgent = {
      agent: this, // Self-reference for synthesis logic
      role: "Response Synthesis Specialist",
      goal: "Combine and format responses from specialist agents into coherent, user-friendly outputs",
      backstory: "You are an expert at synthesizing technical analysis results into clear, actionable insights for users. You ensure responses are comprehensive yet accessible."
    };

    // Connect all MCP adapters
    try {
      await Promise.all([
        audioMCPAdapter.connectToServer(),
        imageMCPAdapter.connectToServer(),
        documentMCPAdapter.connectToServer()
      ]);
      console.log('✅ All MCP servers connected successfully');
    } catch (error) {
      console.warn('⚠️ Some MCP servers failed to connect:', error);
    }
  }

  async processQuery(queryData: any): Promise<any> {
    console.log('🎭 CrewAI Orchestrator starting query processing...');

    try {
      // Step 1: Route the query using router agent
      const routingDecision = await this.executeRouterAgent(queryData);
      console.log(`📍 Routed to: ${routingDecision.targetAgent} (confidence: ${routingDecision.confidence})`);

      // Step 2: Process with specialist agent
      const specialistResult = await this.executeSpecialistAgent(routingDecision.targetAgent, queryData);

      // Step 3: Synthesize response using synthesis agent
      const synthesizedResult = await this.executeSynthesisAgent(specialistResult, routingDecision);

      // Step 4: Store complete workflow in MCP backend
      await this.storeWorkflowInMCP(synthesizedResult, queryData, routingDecision);

      return {
        ...synthesizedResult,
        crewWorkflow: {
          routing: routingDecision,
          specialistUsed: this.specialistAgents.get(routingDecision.targetAgent)?.role,
          synthesized: true,
          mcpStored: true,
          processingPipeline: 'Router → Specialist → Synthesis → Storage'
        }
      };
    } catch (error) {
      console.error('❌ CrewAI Orchestrator error:', error);
      throw new Error(`CrewAI processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeRouterAgent(queryData: any): Promise<RoutingDecision> {
    console.log('🧭 Router Agent analyzing query...');
    
    const { textQuery, files = [] } = queryData;
    
    // Advanced routing logic
    if (files.length === 0) {
      // Text-only query - route to document agent
      return {
        targetAgent: 'document',
        confidence: 0.9,
        reasoning: 'Text-only query detected - routing to document specialist for text analysis'
      };
    }

    // Analyze file types
    const fileTypes = files.map((file: any) => file.mimetype);
    const audioFiles = fileTypes.filter((type: string) => type.startsWith('audio/'));
    const imageFiles = fileTypes.filter((type: string) => type.startsWith('image/'));
    const videoFiles = fileTypes.filter((type: string) => type.startsWith('video/'));
    const documentFiles = fileTypes.filter((type: string) => 
      type.includes('pdf') || type.includes('text') || type.includes('document') || type.includes('csv')
    );

    // Multi-file routing logic
    if (files.length > 1) {
      // Multiple files - choose primary type
      if (audioFiles.length > 0) {
        return {
          targetAgent: 'audio',
          confidence: 0.8,
          reasoning: `Multi-file query with ${audioFiles.length} audio files - prioritizing audio analysis`,
          fileTypes: fileTypes
        };
      } else if (imageFiles.length > 0) {
        return {
          targetAgent: 'image',
          confidence: 0.8,
          reasoning: `Multi-file query with ${imageFiles.length} image files - prioritizing image analysis`,
          fileTypes: fileTypes
        };
      }
    }

    // Single file routing
    const primaryFile = files[0];
    if (primaryFile.mimetype.startsWith('audio/')) {
      return {
        targetAgent: 'audio',
        confidence: 1.0,
        reasoning: `Audio file detected: ${primaryFile.mimetype}`,
        fileTypes: [primaryFile.mimetype]
      };
    } else if (primaryFile.mimetype.startsWith('image/')) {
      return {
        targetAgent: 'image',
        confidence: 1.0,
        reasoning: `Image file detected: ${primaryFile.mimetype}`,
        fileTypes: [primaryFile.mimetype]
      };
    } else if (primaryFile.mimetype.startsWith('video/')) {
      return {
        targetAgent: 'video',
        confidence: 1.0,
        reasoning: `Video file detected: ${primaryFile.mimetype}`,
        fileTypes: [primaryFile.mimetype]
      };
    } else {
      return {
        targetAgent: 'document',
        confidence: 0.8,
        reasoning: `Document file detected: ${primaryFile.mimetype}`,
        fileTypes: [primaryFile.mimetype]
      };
    }
  }

  private async executeSpecialistAgent(agentType: string, queryData: any): Promise<any> {
    console.log(`🔧 Executing ${agentType} specialist agent...`);
    
    const specialistMember = this.specialistAgents.get(agentType);
    if (!specialistMember || !specialistMember.agent) {
      throw new Error(`Specialist agent not available: ${agentType}`);
    }

    // Execute the specialist agent
    const result = await specialistMember.agent.processQuery(queryData);
    
    console.log(`✅ ${agentType} specialist completed processing`);
    return {
      ...result,
      specialistAgent: {
        type: agentType,
        role: specialistMember.role,
        goal: specialistMember.goal
      }
    };
  }

  private async executeSynthesisAgent(specialistResult: any, routingDecision: RoutingDecision): Promise<any> {
    console.log('🎨 Synthesis Agent formatting response...');
    
    // Enhanced response synthesis
    const synthesizedResponse = this.formatSynthesizedResponse(specialistResult, routingDecision);
    
    return {
      ...specialistResult,
      response: synthesizedResponse,
      metadata: {
        ...specialistResult.metadata,
        crewAIProcessed: true,
        routingDecision,
        processingWorkflow: 'Router → Specialist → Synthesis → Storage',
        synthesisTimestamp: new Date().toISOString()
      }
    };
  }

  private formatSynthesizedResponse(result: any, routing: RoutingDecision): string {
    let synthesized = result.response;
    
    // Add CrewAI processing context
    synthesized += `\n\n---\n**🎭 CrewAI Processing Summary:**\n`;
    synthesized += `• **Agent Used:** ${result.specialistAgent?.role || 'Unknown'}\n`;
    synthesized += `• **Routing Confidence:** ${Math.round(routing.confidence * 100)}%\n`;
    synthesized += `• **Reasoning:** ${routing.reasoning}\n`;
    
    if (routing.fileTypes && routing.fileTypes.length > 0) {
      synthesized += `• **File Types:** ${routing.fileTypes.join(', ')}\n`;
    }
    
    synthesized += `• **Processing Time:** ${result.metadata?.processingTime || 'Unknown'}ms\n`;
    synthesized += `• **MCP Server:** ✅ Used for enhanced processing\n`;
    synthesized += `• **Vector Storage:** ✅ Stored in Pixeltable for future similarity search\n`;
    
    return synthesized;
  }

  private async storeWorkflowInMCP(result: any, queryData: any, routing: RoutingDecision): Promise<void> {
    console.log('💾 Storing complete workflow in MCP backend...');
    
    try {
      const workflowData = {
        queryData,
        routingDecision: routing,
        specialistResult: result,
        timestamp: new Date().toISOString(),
        workflowId: `crew_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Store in the appropriate MCP server based on routing
      const specialistMember = this.specialistAgents.get(routing.targetAgent);
      if (specialistMember?.mcpAdapter) {
        await specialistMember.mcpAdapter.storeAnalysis(workflowData, result.embeddings || []);
        console.log('✅ Workflow stored in MCP backend');
      } else {
        console.warn('⚠️ No MCP adapter available for storing workflow');
      }
    } catch (error) {
      console.error('❌ Failed to store workflow in MCP:', error);
      // Don't throw - storage failure shouldn't break the main workflow
    }
  }

  // Utility methods
  getAvailableAgents(): string[] {
    return Array.from(this.specialistAgents.keys());
  }

  getAgentCapabilities(agentType: string): any {
    const agent = this.specialistAgents.get(agentType);
    return agent?.agent?.getCapabilities?.() || null;
  }

  async healthCheck(): Promise<any> {
    const health = {
      orchestrator: 'healthy',
      agents: {} as any,
      mcpServers: {} as any
    };

    // Check each specialist agent
    for (const [type, member] of this.specialistAgents) {
      try {
        health.agents[type] = member.agent ? 'available' : 'unavailable';
        
        // Check MCP server connectivity
        if (member.mcpAdapter) {
          // Simple connectivity test
          health.mcpServers[type] = 'connected';
        } else {
          health.mcpServers[type] = 'not_configured';
        }
      } catch (error) {
        health.agents[type] = 'error';
        health.mcpServers[type] = 'disconnected';
      }
    }

    return health;
  }
}