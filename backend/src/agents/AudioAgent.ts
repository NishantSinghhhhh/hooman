// backend/agents/AudioAgent.ts (Fixed version)
import { MCPServerAdapter } from '../services/MCPServerAdapter';
import { QueryIngestionService } from '../services/queryIngestionService';
import {
  QueryData,
  AgentResponse,
  AgentConfig,
  AgentCapabilities,
  ProcessedFile,
  AudioAnalysis,
  UploadedFile,
} from '../types/agent';
import { createReadStream } from 'fs';

export class AudioAgent {
  private mcpAdapter: MCPServerAdapter;
  private agentName: string = 'AudioSpecialist';
  private fallbackProcessing: boolean = false;

  constructor(config: AgentConfig = {}) {
    // Initialize MCP Server connection
    this.mcpAdapter = new MCPServerAdapter({
      url: config.mcpServerUrl || process.env.AUDIO_MCP_SERVER_URL || 'http://localhost:8001',
      transport: 'sse',
      name: 'audio-mcp-server',
      description: 'Pixeltable-based audio processing server'
    }, 'audio');

    // Enable fallback to local processing if MCP server is unavailable
    this.fallbackProcessing = config.fallbackProcessing || false;
  }

  async initialize(): Promise<void> {
    try {
      await this.mcpAdapter.connectToServer();
      console.log('✅ AudioAgent: MCP server connected');
    } catch (error) {
      console.warn('⚠️ AudioAgent: MCP server unavailable, fallback mode enabled');
      this.fallbackProcessing = true;
    }
  }

  async processQuery(queryData: QueryData): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const { textQuery, files = [], userId } = queryData;
   
      console.log('🔊 MCP-Enabled Audio Agent processing query...');
      console.log(`📝 Query: ${textQuery}`);
      console.log(`🔊 Audio files: ${files.length}`);
   
      let response = '';
      const processedFiles: ProcessedFile[] = [];
   
      if (files.length === 0) {
        response = await this.handleNoAudioQuery(textQuery || '', userId);
      } else {
        for (const file of files) {
          try {
            let audioAnalysis: AudioAnalysis;
            let storageId: string | undefined = undefined;
            
            // Try MCP processing first
            if (!this.fallbackProcessing) {
              try {
                console.log(`🚀 Processing ${file.filename} via MCP server...`);
                
                // Create a readable stream for the file
                const fileStream = createReadStream(file.path);
                
                // Process via MCP server
                const mcpResult = await this.mcpAdapter.processAudio(fileStream, [
                  'transcribe',
                  'extract_metadata',
                  'generate_embeddings',
                  'analyze_content',
                  'detect_language'
                ]);

                audioAnalysis = mcpResult.analysis;
                
                // Store in Pixeltable with embeddings
                if (mcpResult.embeddings && mcpResult.embeddings.length > 0) {
                  storageId = await this.mcpAdapter.storeAnalysis(audioAnalysis, mcpResult.embeddings);
                  console.log(`💾 Audio analysis stored with ID: ${storageId}`);
                }
                
                console.log('✅ MCP processing completed successfully');
                
              } catch (mcpError) {
                console.warn(`⚠️ MCP processing failed for ${file.filename}, falling back to local processing:`, mcpError);
                audioAnalysis = await this.fallbackAudioAnalysis(file);
              }
            } else {
              // Fallback to local processing
              audioAnalysis = await this.fallbackAudioAnalysis(file);
            }

            // Format response for user
            const formattedResponse = this.formatAudioResponse(audioAnalysis, textQuery || '', file);
   
            const processedFile: ProcessedFile = {
              fileName: file.filename,
              fileType: file.mimetype,
              status: 'processed',
              analysis: audioAnalysis,
              response: formattedResponse
            };

            // Add storageId if available
            if (storageId) {
              processedFile.storageId = storageId;
            }

            processedFiles.push(processedFile);
   
            response += `\n\n**Analysis of ${file.filename}:**\n${formattedResponse}`;
          } catch (fileError) {
            console.error(`Error processing audio ${file.filename}:`, fileError);
            processedFiles.push({
              fileName: file.filename,
              fileType: file.mimetype,
              status: 'error',
              error: fileError instanceof Error ? fileError.message : String(fileError),
            });
          }
        }
      }
   
      const agentResponse: AgentResponse = {
        success: true,
        response: response.trim(),
        agentType: 'audio',
        processedFiles,
        capabilities: this.getCapabilities(),
        metadata: {
          processingTime: Date.now() - startTime,
          audioCount: files.length,
          userId,
          mcpProcessed: !this.fallbackProcessing,
          agentName: this.agentName,
          processingMode: this.fallbackProcessing ? 'fallback' : 'mcp'
        },
      };
   
      // Store the query results
      try {
        await QueryIngestionService.storeQuery(
          userId,
          queryData,
          agentResponse,
          Date.now() - startTime
        );
      } catch (ingestionError) {
        console.error('⚠️ Query ingestion failed:', ingestionError);
      }
   
      return agentResponse;
    } catch (error) {
      console.error('❌ MCP Audio Agent error:', error);
      
      const errorResponse: AgentResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response: "I encountered an error while processing your audio. Please try again or contact support if the issue persists.",
        agentType: 'audio',
        metadata: { 
          agentName: this.agentName,
          processingMode: this.fallbackProcessing ? 'fallback' : 'mcp'
        }
      };
   
      try {
        await QueryIngestionService.storeQuery(
          queryData.userId,
          queryData,
          errorResponse,
          Date.now() - startTime
        );
      } catch (ingestionError) {
        console.error('⚠️ Failed query ingestion also failed:', ingestionError);
      }
   
      return errorResponse;
    }
  }

  private async fallbackAudioAnalysis(file: UploadedFile): Promise<AudioAnalysis> {
    console.log(`🔄 Performing fallback analysis for ${file.filename}...`);
    
    // Basic fallback analysis without external processing
    const analysis: AudioAnalysis = {
      fileName: file.filename,
      fileType: file.mimetype,
      duration: 0, // Would need local analysis
      sampleRate: 0,
      channels: 0,
      transcription: 'Transcription unavailable (MCP server offline)',
      language: 'unknown',
      confidence: 0,
      processingMode: 'fallback'
    };

    // Add contentType if it doesn't exist in the base interface
    (analysis as any).contentType = 'unknown';

    return analysis;
  }

  private formatAudioResponse(analysis: AudioAnalysis, userQuery: string, file: UploadedFile): string {
    let response = `**🎵 Audio Analysis Results**\n\n`;
    
    // Processing mode indicator
    if (analysis.processingMode === 'fallback') {
      response += `⚠️ **Note:** Processed in fallback mode (limited functionality)\n\n`;
    } else {
      response += `🚀 **Processed via MCP Server** - Enhanced analysis available\n\n`;
    }
    
    // Technical Details
    response += `**📊 Technical Details:**\n`;
    response += `• Duration: ${analysis.duration ? `${Math.round(analysis.duration)} seconds` : 'Unknown'}\n`;
    response += `• Sample Rate: ${analysis.sampleRate ? `${analysis.sampleRate}Hz` : 'Unknown'}\n`;
    response += `• Channels: ${analysis.channels || 'Unknown'}\n`;
    response += `• File Size: ${Math.round(file.size / (1024 * 1024))}MB\n`;
    response += `• Format: ${file.mimetype}\n\n`;

    // Transcription (if available)
    if (analysis.transcription && analysis.transcription.length > 0 && 
        !analysis.transcription.includes('unavailable')) {
      response += `**📝 Transcription:**\n`;
      response += `${analysis.transcription}\n\n`;
    }

    // Content Analysis (MCP-enhanced features)
    if (analysis.language && analysis.language !== 'unknown') {
      response += `**🧠 Content Analysis:**\n`;
      response += `• Language: ${analysis.language}\n`;
      if (analysis.confidence && analysis.confidence > 0) {
        response += `• Confidence: ${Math.round(analysis.confidence * 100)}%\n`;
      }
      if ((analysis as any).contentType) {
        response += `• Content Type: ${(analysis as any).contentType}\n`;
      }
      if (analysis.sentiment) {
        response += `• Sentiment: ${analysis.sentiment}\n`;
      }
      if (analysis.speakers) {
        response += `• Speakers Detected: ${analysis.speakers}\n`;
      }
      response += `\n`;
    }

    // AI Insights (from MCP processing)
    if (analysis.insights && analysis.insights.length > 0) {
      response += `**💡 AI Insights:**\n`;
      response += `${analysis.insights}\n\n`;
    }

    // Keywords/Topics (from MCP processing)
    if (analysis.keywords && analysis.keywords.length > 0) {
      response += `**🏷️ Key Topics:**\n`;
      response += `${analysis.keywords.join(', ')}\n\n`;
    }

    // Answer user's specific question
    if (userQuery && userQuery !== 'Describe this audio file and its characteristics') {
      response += `**❓ Answer to "${userQuery}":**\n`;
      const queryResponse = (analysis as any).queryResponse;
      if (queryResponse) {
        response += `${queryResponse}\n`;
      } else {
        response += `Based on the audio analysis above, please refer to the transcription and technical details for relevant information.\n`;
      }
    }

    // Similarity search (if MCP processed)
    if (analysis.similarContent && analysis.similarContent.length > 0) {
      response += `\n**🔍 Similar Content Found:**\n`;
      analysis.similarContent.forEach((item: any, index: number) => {
        response += `${index + 1}. ${item.filename} (${Math.round(item.similarity * 100)}% similar)\n`;
      });
    }

    return response;
  }

  private async handleNoAudioQuery(textQuery: string, userId: string): Promise<string> {
    return `I understand you're asking about: **"${textQuery}"**

Since no audio files were uploaded, I can help you with our advanced MCP-powered audio analysis:

🎵 **MCP-Enhanced Audio Processing:**
• **Enterprise-Grade Transcription** - High-accuracy speech recognition via Pixeltable
• **Multi-Language Support** - Automatic detection and transcription of 100+ languages
• **Advanced Content Analysis** - Sentiment, mood, speaker identification, and thematic analysis
• **Vector Embeddings** - Audio content stored as embeddings for similarity search
• **Speaker Diarization** - Distinguish and identify multiple speakers in conversations
• **Audio Enhancement Suggestions** - Quality assessment and improvement recommendations
• **Intelligent Search** - Find similar audio content from your previous uploads

🔍 **Advanced Capabilities:**
• Voice pattern analysis and recognition
• Music genre and mood classification
• Podcast and lecture content extraction
• Call center and interview analysis
• Audio book and narration processing
• Sound effect and ambient audio classification

📁 **Supported Formats:** MP3, WAV, M4A, AAC, OGG, FLAC (up to 25MB)

💾 **Smart Storage & Search:** 
All processed audio is stored with vector embeddings in Pixeltable, enabling:
- Similarity search across your audio library
- Content-based recommendations
- Duplicate detection
- Cross-reference with other media types

${this.fallbackProcessing ? 
  '⚠️ **Note:** Currently running in fallback mode. Full MCP features may be limited.' : 
  '🚀 **MCP Server Active:** Full enhanced processing available!'}

Please upload your audio files to experience our advanced analysis capabilities!`;
  }

  getCapabilities(): AgentCapabilities {
    const baseCapabilities = [
      'Audio content transcription and analysis',
      'Metadata extraction and technical assessment',
      'Basic audio format support'
    ];

    const mcpCapabilities = [
      'MCP-powered high-accuracy transcription (100+ languages)',
      'Advanced audio embeddings for similarity search',
      'Speaker identification and diarization',
      'Content sentiment and mood analysis',
      'Audio quality enhancement suggestions',
      'Vector storage in Pixeltable database',
      'Cross-media content correlation',
      'Real-time similarity search',
      'Advanced audio feature extraction'
    ];

    return {
      agentType: 'audio',
      supportedFormats: [
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
        'audio/m4a',
        'audio/aac',
        'audio/ogg',
        'audio/flac',
      ],
      capabilities: this.fallbackProcessing ? baseCapabilities : mcpCapabilities,
      maxFileSize: '25MB per file',
      processingTime: this.fallbackProcessing ? 
        'Medium (30-60 seconds - fallback mode)' : 
        'Fast (5-30 seconds via MCP server)',
      accuracy: this.fallbackProcessing ? 
        'Medium (fallback mode)' : 
        'Very High (Enterprise MCP-powered)',
      languages: this.fallbackProcessing ? 
        ['English (primary)'] : 
        ['100+ languages via MCP server']
    };
  }

  async connectToMCP(): Promise<void> {
    await this.initialize();
  }

  // Method to search similar audio content
  async searchSimilarAudio(queryEmbeddings: number[], limit: number = 5): Promise<any[]> {
    if (this.fallbackProcessing) {
      console.warn('⚠️ Similarity search unavailable in fallback mode');
      return [];
    }

    try {
      return await this.mcpAdapter.searchSimilar(queryEmbeddings, limit);
    } catch (error) {
      console.error('❌ Failed to search similar audio:', error);
      return [];
    }
  }
}