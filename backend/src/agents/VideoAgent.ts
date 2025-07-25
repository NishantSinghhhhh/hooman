// backend/agents/VideoAgent.ts
import { OpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import ffmpeg from 'fluent-ffmpeg';   // <--- Corrected import (default, NOT namespace)
import { promises as fs } from 'fs';
import path from 'path';
import {
  QueryData,
  AgentResponse,
  AgentConfig,
  AgentCapabilities,
  ProcessedFile,
  VideoAnalysis,
  UploadedFile
} from '../types/agent';

export class VideoAgent {
  private llm: OpenAI | ChatOllama;
  private analysisPrompt: PromptTemplate;
  private analysisChain: LLMChain;

  constructor(config: AgentConfig = {}) {
    this.llm = config.useOllama 
      ? new ChatOllama({
          baseUrl: config.ollamaBaseUrl || "http://localhost:11434",
          model: config.ollamaModel || "llama2",
          temperature: config.temperature || 0.1
        })
      : (() => {
          const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
          if (!apiKey) throw new Error('OpenAI API key is required');
          return new OpenAI({
            openAIApiKey: apiKey,
            temperature: config.temperature || 0.1
          });
        })();

    this.analysisPrompt = PromptTemplate.fromTemplate(`
You are an expert video analyst. Based on the video analysis data provided, answer the user's question comprehensively.

User Question: {userQuery}

Video Analysis Data:
{videoAnalysis}

Video Metadata:
- File Name: {fileName}
- Duration: {duration}
- Resolution: {resolution}
- File Size: {fileSize}
- Format: {format}

Instructions:
1. Analyze the provided video data carefully
2. Answer the user's question based on video metadata and any transcribed content
3. Describe video characteristics like duration, resolution, and quality
4. If transcription is available, include relevant audio content
5. Provide helpful insights about the video content

Response:
`);

    this.analysisChain = new LLMChain({
      llm: this.llm,
      prompt: this.analysisPrompt
    });
  }

  async processQuery(queryData: QueryData): Promise<AgentResponse> {
    try {
      const { textQuery, files = [], userId } = queryData;
      
      console.log('🎞️ Video Agent processing query...');
      console.log(`📝 Query: ${textQuery}`);
      console.log(`🎞️ Videos: ${files.length}`);

      let response = '';
      const processedFiles: ProcessedFile[] = [];

      if (files.length === 0) {
        response = await this.handleNoVideosQuery(textQuery || '', userId);
      } else {
        // Process video files
        for (const file of files) {
          try {
            const videoAnalysis = await this.analyzeVideo(file);
            const llmResponse = await this.getLLMAnalysis(videoAnalysis, textQuery || '', file);
            processedFiles.push({
              fileName: file.filename,
              fileType: file.mimetype,
              status: 'processed',
              analysis: videoAnalysis,
              response: llmResponse
            });
            response += `\n\n**Analysis of ${file.filename}:**\n${llmResponse}`;
          } catch (fileError) {
            console.error(`Error processing video ${file.filename}:`, fileError);
            processedFiles.push({
              fileName: file.filename,
              fileType: file.mimetype,
              status: 'error',
              error: fileError instanceof Error ? fileError.message : String(fileError)
            });
          }
        }
      }
      return {
        success: true,
        response: response.trim(),
        agentType: 'video',
        processedFiles,
        capabilities: this.getCapabilities(),
        metadata: {
          processingTime: Date.now(),
          videoCount: files.length,
          userId
        }
      };
    } catch (error) {
      console.error('❌ Video Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response: "I encountered an error while analyzing your video. Please try again or contact support if the issue persists.",
        agentType: 'video'
      };
    }
  }

  private async analyzeVideo(file: UploadedFile): Promise<VideoAnalysis> {
    const filePath = file.path;
    const analysis: VideoAnalysis = {
      fileName: file.filename,
      fileType: file.mimetype
    };

    try {
      console.log('🎞️ Analyzing video metadata...');
      // Get video metadata using ffmpeg
      const metadata = await this.getVideoMetadata(filePath);
      analysis.duration = metadata.duration ?? 0;
      analysis.resolution = metadata.resolution ?? 'Unknown';
      analysis.frameRate = metadata.frameRate ?? 0;

      // Generate thumbnail
      analysis.thumbnail = await this.generateThumbnail(filePath, file.filename);

      // Extract audio and transcribe (placeholder)
      console.log('🎵 Attempting audio extraction...');
      analysis.transcription = await this.extractAndTranscribeAudio(filePath);

      console.log('✅ Video analysis completed');
      return analysis;
    } catch (error) {
      console.error('Video analysis error:', error);
      throw new Error(`Failed to analyze video: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getVideoMetadata(filePath: string): Promise<{
    duration?: number;
    resolution?: string;
    frameRate?: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
        const duration = metadata.format.duration ? Number(metadata.format.duration) : undefined;
        const resolution = (videoStream && videoStream.width && videoStream.height)
          ? `${videoStream.width}x${videoStream.height}` : undefined;
        const frameRate = videoStream?.r_frame_rate
          ? this.parseFrameRate(videoStream.r_frame_rate) : undefined;
          resolve({
            duration: duration ?? 0,
            resolution: resolution ?? 'Unknown',
            frameRate: frameRate ?? 0,
          });
          
      });
    });
  }

  private parseFrameRate(frameRateStr: string): number | undefined {
    try {
      // frameRate string is usually in the form '30000/1001' or '25'
      const parts = frameRateStr.split('/');
      if (parts.length === 2 && !isNaN(+parts[0]) && !isNaN(+parts[1])) {
        return +parts[1] !== 0 ? Number(parts[0]) / Number(parts[1]) : undefined;
      }
      const fr = parseFloat(frameRateStr);
      return isNaN(fr) ? undefined : fr;
    } catch {
      return undefined;
    }
  }

  private async generateThumbnail(videoPath: string, originalName: string): Promise<string> {
    return new Promise((resolve) => {
      const thumbnailPath = path.join(
        path.dirname(videoPath), 
        `thumbnail_${path.basename(originalName, path.extname(originalName))}.jpg`
      );
      ffmpeg(videoPath)
        .on('end', () => resolve(thumbnailPath))
        .on('error', (err) => {
          console.warn('Could not generate thumbnail:', err.message);
          resolve(''); // Return empty string if fail
        })
        .screenshots({
          timestamps: ['50%'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '320x240'
        });
    });
  }

  private async extractAndTranscribeAudio(videoPath: string): Promise<string> {
    try {
      const audioPath = path.join(
        path.dirname(videoPath),
        `audio_${path.basename(videoPath, path.extname(videoPath))}.wav`
      );
      // Extract audio using ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .audioCodec('pcm_s16le')
          .audioChannels(1)
          .audioFrequency(16000)
          .format('wav')
          .output(audioPath)
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      });
      // In a real implementation, use Whisper, etc.
      console.log('🎵 Audio extracted, transcription would happen here');
      try { await fs.unlink(audioPath); } catch {}
      return 'Audio transcription not yet implemented. This would contain the spoken content from the video.';
    } catch (error) {
      console.warn('Audio extraction failed:', error);
      return '';
    }
  }

  private async getLLMAnalysis(videoAnalysis: VideoAnalysis, userQuery: string, file: UploadedFile): Promise<string> {
    try {
      const analysisData = {
        duration: videoAnalysis.duration,
        resolution: videoAnalysis.resolution,
        frameRate: videoAnalysis.frameRate,
        transcription: videoAnalysis.transcription,
        hasThumbnail: !!videoAnalysis.thumbnail
      };
      const response = await this.analysisChain.call({
        userQuery: userQuery || 'Describe this video and its characteristics',
        videoAnalysis: JSON.stringify(analysisData, null, 2),
        fileName: file.filename,
        duration: videoAnalysis.duration ? `${Math.round(videoAnalysis.duration)}s` : 'Unknown',
        resolution: videoAnalysis.resolution || 'Unknown',
        fileSize: `${Math.round(file.size / (1024 * 1024))}MB`,
        format: file.mimetype
      });
      return response.text;
    } catch (error) {
      console.error('LLM analysis error:', error);
      return `Error in detailed analysis. Basic info: Video file ${file.filename}, size: ${Math.round(file.size / (1024 * 1024))}MB${videoAnalysis.duration ? `, duration: ${Math.round(videoAnalysis.duration)}s` : ''}`;
    }
  }

  private async handleNoVideosQuery(textQuery: string, userId: string): Promise<string> {
    return `I understand you're asking about: "${textQuery}"

Since no videos were uploaded, I can help you with:
1. Upload videos (MP4, AVI, MOV, etc.) for me to analyze
2. Extract audio and transcribe speech from videos
3. Generate video summaries and descriptions
4. Analyze video metadata and technical properties
5. Create thumbnails from videos

Please upload some videos and I'll be happy to analyze them for you!`;
  }

  getCapabilities(): AgentCapabilities {
    return {
      agentType: 'video',
      supportedFormats: [
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
        'video/flv', 'video/webm', 'video/mkv'
      ],
      capabilities: [
        'Video metadata extraction',
        'Thumbnail generation',
        'Audio extraction and transcription',
        'Video quality assessment',
        'Duration and format analysis',
        'Frame rate detection',
        'Resolution analysis'
      ],
      maxFileSize: '100MB',
      processingTime: 'Slow (30-120 seconds)',
      accuracy: 'High for metadata, Medium for content analysis'
    };
  }

  async connectToMCP(): Promise<void> {
    console.log('📡 Connecting to Video MCP Server...');
    // Implementation for Pixeltable video MCP server
  }
}
