// backend/agents/AudioAgent.ts
import OpenAI from 'openai';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import {
  QueryData,
  AgentResponse,
  AgentConfig,
  AgentCapabilities,
  ProcessedFile,
  AudioAnalysis,
  UploadedFile,
} from '../types/agent';

export class AudioAgent {
  private openaiClient?: OpenAI;
  private ollamaConfig?: {
    baseUrl: string;
    model: string;
  };

  constructor(config: AgentConfig = {}) {
    if (config.useOllama) {
      this.ollamaConfig = {
        baseUrl: config.ollamaBaseUrl || 'http://localhost:11434',
        model: config.ollamaModel || 'llama2',
      };
    } else {
      const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
      if (apiKey) {
        this.openaiClient = new OpenAI({ apiKey });
      }
    }
  }

  async processQuery(queryData: QueryData): Promise<AgentResponse> {
    try {
      const { textQuery, files = [], userId } = queryData;

      console.log('🔊 Audio Agent processing query...');
      console.log(`📝 Query: ${textQuery}`);
      console.log(`🔊 Audio files: ${files.length}`);

      let response = '';
      const processedFiles: ProcessedFile[] = [];

      if (files.length === 0) {
        response = await this.handleNoAudioQuery(textQuery || '', userId);
      } else {
        for (const file of files) {
          try {
            const audioAnalysis = await this.analyzeAudio(file);
            const llmResponse = await this.getLLMAnalysis(audioAnalysis, textQuery || '', file);

            processedFiles.push({
              fileName: file.filename,
              fileType: file.mimetype,
              status: 'processed',
              analysis: audioAnalysis,
              response: llmResponse,
            });

            response += `\n\n**Analysis of ${file.filename}:**\n${llmResponse}`;
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

      return {
        success: true,
        response: response.trim(),
        agentType: 'audio',
        processedFiles,
        capabilities: this.getCapabilities(),
        metadata: {
          processingTime: Date.now(),
          audioCount: files.length,
          userId,
        },
      };
    } catch (error) {
      console.error('❌ Audio Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response:
          "I encountered an error while analyzing your audio. Please try again or contact support if the issue persists.",
        agentType: 'audio',
      };
    }
  }

  private async analyzeAudio(file: UploadedFile): Promise<AudioAnalysis> {
    const filePath = file.path;
    const analysis: AudioAnalysis = {
      fileName: file.filename,
      fileType: file.mimetype,
    };

    try {
      console.log('🔊 Analyzing audio metadata...');

      const metadata = await this.getAudioMetadata(filePath);
      analysis.duration = metadata.duration ?? 0;
      analysis.sampleRate = metadata.sampleRate ?? 0;
      analysis.channels = metadata.channels ?? 0;

      if (this.openaiClient) {
        console.log('🎤 Attempting audio transcription...');
        analysis.transcription = await this.transcribeWithWhisper(filePath);
        analysis.language = 'auto-detected';
        analysis.confidence = 0.9;
      } else {
        analysis.transcription = 'Audio transcription not available (OpenAI API key required)';
        analysis.language = 'unknown';
        analysis.confidence = 0;
      }

      console.log('✅ Audio analysis completed');
      return analysis;
    } catch (error) {
      console.error('Audio analysis error:', error);
      throw new Error(`Failed to analyze audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getAudioMetadata(filePath: string): Promise<{
    duration?: number;
    sampleRate?: number;
    channels?: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
        const duration = metadata.format.duration ? Number(metadata.format.duration) : undefined;
        const sampleRate = audioStream?.sample_rate ? Number(audioStream.sample_rate) : undefined;
        const channels = audioStream?.channels ? Number(audioStream.channels) : undefined;

        // Provide defaults here to avoid TS errors with exactOptionalPropertyTypes
        resolve({
          duration: duration ?? 0,
          sampleRate: sampleRate ?? 0,
          channels: channels ?? 0,
        });
      });
    });
  }

  private async transcribeWithWhisper(audioPath: string): Promise<string> {
    if (!this.openaiClient) return 'OpenAI client not available';

    try {
      // Convert audio to MP3 for Whisper compatibility
      const mp3Path = path.join(
        path.dirname(audioPath),
        `whisper_${path.basename(audioPath, path.extname(audioPath))}.mp3`
      );

      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioPath)
          .audioCodec('libmp3lame') // Correct MP3 codec
          .audioBitrate(128)
          .format('mp3')
          .output(mp3Path)
          .on('end', () => resolve())        // Wrap resolve in arrow function to fix type error
          .on('error', (err) => reject(err)) // Wrap reject similarly
          .run();
      });

      // Use a readable stream to satisfy OpenAI's 'Uploadable' type
      const stream = createReadStream(mp3Path);

      const transcriptionResponse = await this.openaiClient.audio.transcriptions.create({
        file: stream,    // Stream instead of Buffer to satisfy types
        model: 'whisper-1',
        // language: 'en',  // optional, Whisper can auto-detect language
      });

      // Clean up temporary MP3 file
      try {
        await fs.unlink(mp3Path);
      } catch {
        // Ignore cleanup errors
      }

      return transcriptionResponse.text ?? 'No transcription available';
    } catch (error) {
      console.warn('Whisper transcription failed:', error);
      return 'Audio transcription failed. Please check your OpenAI API key and try again.';
    }
  }

  private async getLLMAnalysis(audioAnalysis: AudioAnalysis, userQuery: string, file: UploadedFile): Promise<string> {
    try {
      const analysisData = {
        duration: audioAnalysis.duration,
        sampleRate: audioAnalysis.sampleRate,
        channels: audioAnalysis.channels,
        transcription: audioAnalysis.transcription,
        language: audioAnalysis.language,
        confidence: audioAnalysis.confidence,
      };

      const prompt = `You are an expert audio analyst. Based on the audio analysis data provided, answer the user's question comprehensively.

User Question: ${userQuery || 'Describe this audio file and its characteristics'}

Audio Analysis Data:
${JSON.stringify(analysisData, null, 2)}

Audio Metadata:
- File Name: ${file.filename}
- Duration: ${audioAnalysis.duration ? `${Math.round(audioAnalysis.duration)}s` : 'Unknown'}
- Sample Rate: ${audioAnalysis.sampleRate ? `${audioAnalysis.sampleRate}Hz` : 'Unknown'}
- Channels: ${audioAnalysis.channels ? audioAnalysis.channels.toString() : 'Unknown'}
- File Size: ${Math.round(file.size / (1024 * 1024))}MB
- Format: ${file.mimetype}

Instructions:
1. Analyze the provided audio data carefully
2. Answer the user's question based on audio metadata and transcribed content
3. Describe audio characteristics like duration, quality, and format
4. If transcription is available, provide insights about the spoken content
5. Offer helpful analysis of the audio content

Response:`;

      let responseText: string;

      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 500,
        });
        responseText = completion.choices[0]?.message?.content || '';
      } else if (this.ollamaConfig) {
        const response = await axios.post(`${this.ollamaConfig.baseUrl}/api/generate`, {
          model: this.ollamaConfig.model,
          prompt,
          stream: false,
        });
        responseText = response.data.response || '';
      } else {
        responseText = `Audio file analysis:
- File: ${file.filename}
- Duration: ${audioAnalysis.duration ? `${Math.round(audioAnalysis.duration)} seconds` : 'Unknown'}
- Sample Rate: ${audioAnalysis.sampleRate ? `${audioAnalysis.sampleRate}Hz` : 'Unknown'}
- Channels: ${audioAnalysis.channels ?? 'Unknown'}
- Size: ${Math.round(file.size / (1024 * 1024))}MB
- Format: ${file.mimetype}

${audioAnalysis.transcription ? `Transcription: ${audioAnalysis.transcription}` : 'No transcription available'}`;
      }

      return responseText;
    } catch (error) {
      console.error('LLM analysis error:', error);
      return `Error in detailed analysis. Basic info: Audio file ${file.filename}, size: ${Math.round(
        file.size / (1024 * 1024)
      )}MB${audioAnalysis.duration ? `, duration: ${Math.round(audioAnalysis.duration)}s` : ''}`;
    }
  }

  private async handleNoAudioQuery(textQuery: string, userId: string): Promise<string> {
    return `I understand you're asking about: "${textQuery}"

Since no audio files were uploaded, I can help you with:
1. Upload audio files (MP3, WAV, M4A, etc.) for me to analyze
2. Transcribe speech from audio recordings using OpenAI Whisper
3. Analyze audio quality and technical properties
4. Extract metadata from audio files
5. Identify language and content in audio

Please upload some audio files and I'll be happy to analyze them for you!`;
  }

  getCapabilities(): AgentCapabilities {
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
      capabilities: [
        'Audio transcription (OpenAI Whisper)',
        'Metadata extraction',
        'Quality analysis',
        'Language detection',
        'Format conversion',
        'Duration and technical analysis',
      ],
      maxFileSize: '25MB (Whisper limit)',
      processingTime: 'Medium (15-60 seconds)',
      accuracy: 'Very High (OpenAI Whisper)',
      languages: ['English', 'Spanish', 'French', 'German', '90+ languages supported'],
    };
  }

  async connectToMCP(): Promise<void> {
    console.log('📡 Connecting to Audio MCP Server...');
    // Implementation for Pixeltable audio MCP server
  }
}
