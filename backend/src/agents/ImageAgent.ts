// backend/agents/ImageAgent.ts
import { OpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import sharp from 'sharp';
import * as Tesseract from 'tesseract.js';
import { promises as fs } from 'fs';
import  path from 'path';
import {
  QueryData,
  AgentResponse,
  AgentConfig,
  AgentCapabilities,
  ProcessedFile,
  ImageAnalysis,
  UploadedFile
} from '../types/agent';

export class ImageAgent {
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
You are an expert image analyst. Based on the image analysis data provided, answer the user's question comprehensively.

User Question: {userQuery}

Image Analysis Data:
{imageAnalysis}

Image Metadata:
- File Name: {fileName}
- Dimensions: {dimensions}
- File Size: {fileSize}
- Format: {format}

Instructions:
1. Analyze the provided image data carefully
2. Answer the user's question based on what you can determine from the image
3. Be descriptive and specific about visual elements
4. If OCR text was extracted, include relevant text content
5. Provide helpful insights about the image content

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
      
      console.log('🖼️ Image Agent processing query...');
      console.log(`📝 Query: ${textQuery}`);
      console.log(`🖼️ Images: ${files.length}`);

      let response = '';
      const processedFiles: ProcessedFile[] = [];

      if (files.length === 0) {
        response = await this.handleNoImagesQuery(textQuery || '', userId);
      } else {
        // Process image files
        for (const file of files) {
          try {
            const imageAnalysis = await this.analyzeImage(file);
            const llmResponse = await this.getLLMAnalysis(imageAnalysis, textQuery || '', file);
            
            processedFiles.push({
              fileName: file.filename,
              fileType: file.mimetype,
              status: 'processed',
              analysis: imageAnalysis,
              response: llmResponse
            });
            
            response += `\n\n**Analysis of ${file.filename}:**\n${llmResponse}`;
            
          } catch (fileError) {
            console.error(`Error processing image ${file.filename}:`, fileError);
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
        agentType: 'image',
        processedFiles: processedFiles,
        capabilities: this.getCapabilities(),
        metadata: {
          processingTime: Date.now(),
          imageCount: files.length,
          userId: userId
        }
      };

    } catch (error) {
      console.error('❌ Image Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response: "I encountered an error while analyzing your images. Please try again or contact support if the issue persists.",
        agentType: 'image'
      };
    }
  }

  private async analyzeImage(file: UploadedFile): Promise<ImageAnalysis> {
    const filePath = file.path;
    const analysis: ImageAnalysis = {
      fileName: file.filename,
      fileType: file.mimetype,
      metadata: {
        width: 0,
        height: 0,
        format: '',
        fileSize: file.size
      },
      ocrText: '',
      description: '',
      features: []
    };

    try {
      // Get image metadata using Sharp
      const metadata = await sharp(filePath).metadata();
      analysis.metadata = {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || '',
        fileSize: file.size,
        hasAlpha: metadata.hasAlpha ?? false,    // Use nullish coalescing for a default value
        channels: metadata.channels ?? 0
      };
      

      // Perform OCR to extract text
      console.log('🔍 Running OCR on image...');
      const ocrResult = await Tesseract.recognize(filePath, 'eng', {
        logger: (m: any) => console.log('OCR Progress:', m)
      });
      analysis.ocrText = ocrResult.data.text.trim();

      // Basic image description
      analysis.description = await this.generateImageDescription(file, metadata);

      // Extract basic features
      analysis.features = await this.extractImageFeatures(filePath, metadata);

      console.log('✅ Image analysis completed');
      return analysis;

    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateImageDescription(file: UploadedFile, metadata: sharp.Metadata): Promise<string> {
    // Basic description based on file properties
    let description = `This is a ${(metadata.format || 'unknown').toUpperCase()} image`;
    description += ` with dimensions ${metadata.width}x${metadata.height} pixels.`;
    
    // Determine image characteristics
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio > 1.5) {
        description += ' It appears to be a landscape-oriented image.';
      } else if (aspectRatio < 0.75) {
        description += ' It appears to be a portrait-oriented image.';
      } else {
        description += ' It has a roughly square aspect ratio.';
      }
    }

    if (metadata.hasAlpha) {
      description += ' The image includes transparency information.';
    }

    return description;
  }

  private async extractImageFeatures(filePath: string, metadata: sharp.Metadata): Promise<string[]> {
    const features: string[] = [];

    try {
      // Analyze image statistics
      const stats = await sharp(filePath).stats();

      if (stats) {
        features.push(`Image has ${stats.channels.length} color channels`);
        
        // Check if image is likely grayscale
        if (stats.channels.length === 1 || 
            (stats.channels.length >= 3 && 
             Math.abs(stats.channels[0].mean - stats.channels[1].mean) < 5 &&
             Math.abs(stats.channels[1].mean - stats.channels[2].mean) < 5)) {
          features.push('Image appears to be grayscale or monochromatic');
        }
      }

      // Size classification
      if (metadata.width && metadata.height) {
        const pixelCount = metadata.width * metadata.height;
        if (pixelCount > 2000000) {
          features.push('High resolution image (>2MP)');
        } else if (pixelCount > 500000) {
          features.push('Medium resolution image');
        } else {
          features.push('Low resolution image');
        }
      }

    } catch (error) {
      console.warn('Could not extract advanced features:', error instanceof Error ? error.message : String(error));
    }

    return features;
  }

  private async getLLMAnalysis(imageAnalysis: ImageAnalysis, userQuery: string, file: UploadedFile): Promise<string> {
    try {
      const analysisData = {
        metadata: imageAnalysis.metadata,
        ocrText: imageAnalysis.ocrText,
        description: imageAnalysis.description,
        features: imageAnalysis.features.join(', ')
      };

      const response = await this.analysisChain.call({
        userQuery: userQuery || 'Describe what you see in this image',
        imageAnalysis: JSON.stringify(analysisData, null, 2),
        fileName: file.filename,
        dimensions: `${imageAnalysis.metadata.width}x${imageAnalysis.metadata.height}`,
        fileSize: `${Math.round(file.size / 1024)}KB`,
        format: imageAnalysis.metadata.format
      });

      return response.text;
    } catch (error) {
      console.error('LLM analysis error:', error);
      return `Error in detailed analysis. Basic analysis: ${imageAnalysis.description}${imageAnalysis.ocrText ? '\n\nExtracted text: ' + imageAnalysis.ocrText : ''}`;
    }
  }

  private async handleNoImagesQuery(textQuery: string, userId: string): Promise<string> {
    return `I understand you're asking about: "${textQuery}"

Since no images were uploaded, I can help you with:
1. Upload images (JPG, PNG, GIF, etc.) for me to analyze
2. Extract text from images using OCR
3. Describe visual content in images
4. Search for objects or features in images
5. Compare multiple images

Please upload some images and I'll be happy to analyze them for you!`;
  }

  getCapabilities(): AgentCapabilities {
    return {
      agentType: 'image',
      supportedFormats: [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/webp'
      ],
      capabilities: [
        'Image content analysis',
        'OCR text extraction',
        'Object detection (basic)',
        'Image metadata extraction',
        'Visual feature analysis',
        'Image format conversion',
        'Resolution and quality assessment'
      ],
      maxFileSize: '20MB',
      processingTime: 'Fast (2-15 seconds)',
      accuracy: 'High for text extraction, Medium for object detection'
    };
  }

  // MCP Integration placeholder
  async connectToMCP(): Promise<void> {
    console.log('📡 Connecting to Image MCP Server...');
    // Implementation for Pixeltable image MCP server
  }
}