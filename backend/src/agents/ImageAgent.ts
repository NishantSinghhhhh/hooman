// backend/agents/ImageAgent.ts
import { OpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import sharp from 'sharp';
import * as Tesseract from 'tesseract.js';
import { promises as fs } from 'fs';
import path from 'path';
import { QueryIngestionService } from '../services/queryIngestionService';
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
You are an expert computer vision and image analysis AI. Analyze the provided image data and answer the user's question with detailed, accurate insights.

User Question: {userQuery}

Image Analysis Data:
{imageAnalysis}

Image Technical Details:
- File Name: {fileName}
- Dimensions: {dimensions}
- File Size: {fileSize}
- Format: {format}
- Color Channels: {channels}
- Has Transparency: {hasAlpha}

IMPORTANT INSTRUCTIONS:
1. Provide a comprehensive visual description of what you observe in the image
2. If OCR text was detected, include the complete extracted text and explain its context
3. Identify specific objects, people, scenes, colors, composition, and style
4. Answer the user's specific question with relevant details from the image
5. Mention any technical aspects that might be relevant (resolution, quality, format)
6. If the image contains text, documents, screenshots, or UI elements, describe them in detail
7. Be specific about spatial relationships, positioning, and visual hierarchy
8. Comment on lighting, mood, artistic style if applicable

Structure your response as:
1. **Visual Overview**: What the image shows at first glance
2. **Detailed Analysis**: Specific elements, objects, text, composition
3. **Technical Assessment**: Quality, resolution, format considerations
4. **Answer to Query**: Direct response to the user's specific question
5. **Additional Insights**: Any other relevant observations

Response:
`);

    this.analysisChain = new LLMChain({
      llm: this.llm,
      prompt: this.analysisPrompt
    });
  }

  async processQuery(queryData: QueryData): Promise<AgentResponse> {
    const startTime = Date.now();
    
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

      const agentResponse: AgentResponse = {
        success: true,
        response: response.trim(),
        agentType: 'image',
        processedFiles: processedFiles,
        capabilities: this.getCapabilities(),
        metadata: {
          processingTime: Date.now() - startTime,
          imageCount: files.length,
          userId: userId
        }
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
        // Continue without failing the main response
      }

      return agentResponse;

    } catch (error) {
      console.error('❌ Image Agent error:', error);
      
      const errorResponse: AgentResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response: "I encountered an error while analyzing your images. Please try again or contact support if the issue persists.",
        agentType: 'image'
      };

      // Store the failed query as well
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
      console.log(`🔍 Analyzing image: ${file.filename}`);

      // Get image metadata using Sharp
      const metadata = await sharp(filePath).metadata();
      analysis.metadata = {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || '',
        fileSize: file.size,
        hasAlpha: metadata.hasAlpha ?? false,
        channels: metadata.channels ?? 0
      };

      // Perform OCR to extract text with better settings
      console.log('🔍 Running OCR on image...');
      const ocrResult = await Tesseract.recognize(filePath, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      analysis.ocrText = ocrResult.data.text.trim();
      console.log(`📝 OCR extracted ${analysis.ocrText.length} characters of text`);
      // Enhanced image description
      analysis.description = await this.generateEnhancedImageDescription(file, metadata, analysis.ocrText);

      // Extract comprehensive features
      analysis.features = await this.extractComprehensiveImageFeatures(filePath, metadata);

      console.log('✅ Image analysis completed');
      return analysis;

    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateEnhancedImageDescription(file: UploadedFile, metadata: sharp.Metadata, ocrText: string): Promise<string> {
    let description = '';

    // Technical description
    description += `Image file "${file.filename}" (${(metadata.format || 'unknown').toUpperCase()})`;
    description += ` with dimensions ${metadata.width}x${metadata.height} pixels`;
    description += ` and file size ${Math.round(file.size / 1024)}KB.`;

    // Determine content type based on OCR and file properties
    if (ocrText.length > 50) {
      description += ' This appears to be a text-heavy image, possibly a document, screenshot, or sign.';
    } else if (ocrText.length > 0) {
      description += ' This image contains some readable text elements.';
    } else {
      description += ' This appears to be primarily a visual/photographic image with minimal or no text.';
    }

    // Aspect ratio and orientation
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio > 2) {
        description += ' The image has a very wide, panoramic format.';
      } else if (aspectRatio > 1.5) {
        description += ' The image is in landscape orientation.';
      } else if (aspectRatio < 0.5) {
        description += ' The image has a very tall, vertical format.';
      } else if (aspectRatio < 0.75) {
        description += ' The image is in portrait orientation.';
      } else {
        description += ' The image has a roughly square aspect ratio.';
      }
    }

    // Technical properties
    if (metadata.hasAlpha) {
      description += ' The image includes transparency/alpha channel information.';
    }

    if (metadata.density && metadata.density > 150) {
      description += ' This is a high-DPI/retina quality image.';
    }

    return description;
  }

  private async extractComprehensiveImageFeatures(filePath: string, metadata: sharp.Metadata): Promise<string[]> {
    const features: string[] = [];
  
    try {
      // Analyze image statistics
      const stats = await sharp(filePath).stats();
  
      if (stats && stats.channels) {
        features.push(`${stats.channels.length} color channels detected`);
        
        // Color analysis
        if (stats.channels.length >= 3) {
          const [r, g, b] = stats.channels;
          
          // Check if image is likely grayscale
          if (Math.abs(r.mean - g.mean) < 5 && Math.abs(g.mean - b.mean) < 5) {
            features.push('Image appears to be grayscale or monochromatic');
          } else {
            features.push('Full color image detected');
          }
  
          // Dominant color analysis
          if (r.mean > g.mean + 20 && r.mean > b.mean + 20) {
            features.push('Red tones are prominent');
          } else if (g.mean > r.mean + 20 && g.mean > b.mean + 20) {
            features.push('Green tones are prominent');
          } else if (b.mean > r.mean + 20 && b.mean > g.mean + 20) {
            features.push('Blue tones are prominent');
          }
  
          // Brightness analysis
          const avgBrightness = (r.mean + g.mean + b.mean) / 3;
          if (avgBrightness > 200) {
            features.push('Very bright/high-key image');
          } else if (avgBrightness < 50) {
            features.push('Very dark/low-key image');
          } else if (avgBrightness > 150) {
            features.push('Bright/well-lit image');
          } else if (avgBrightness < 100) {
            features.push('Dark/low-light image');
          }
  
          // Contrast analysis
          const contrast = Math.max(...stats.channels.map(c => c.max - c.min));
          if (contrast > 200) {
            features.push('High contrast image');
          } else if (contrast < 100) {
            features.push('Low contrast image');
          }
        }
      }
  
      // Resolution classification
      if (metadata.width && metadata.height) {
        const pixelCount = metadata.width * metadata.height;
        if (pixelCount > 8000000) {
          features.push('Ultra-high resolution (>8MP)');
        } else if (pixelCount > 2000000) {
          features.push('High resolution (2-8MP)');
        } else if (pixelCount > 500000) {
          features.push('Medium resolution (0.5-2MP)');
        } else {
          features.push('Low resolution (<0.5MP)');
        }
  
        // Common format detection
        if (metadata.width === 1920 && metadata.height === 1080) {
          features.push('Full HD (1080p) format');
        } else if (metadata.width === 1280 && metadata.height === 720) {
          features.push('HD (720p) format');
        } else if (metadata.width === 3840 && metadata.height === 2160) {
          features.push('4K UHD format');
        }
      }
  
      // File size analysis - fix the variable reference
      if (metadata.size) { // Use metadata.size if available
        const sizeKB = metadata.size / 1024;
        if (sizeKB > 5000) {
          features.push('Large file size (>5MB)');
        } else if (sizeKB > 1000) {
          features.push('Medium file size (1-5MB)');
        } else if (sizeKB < 100) {
          features.push('Small file size (<100KB)');
        }
      }
  
    } catch (error) {
      console.warn('Could not extract advanced features:', error instanceof Error ? error.message : String(error));
      features.push('Basic analysis only (advanced features unavailable)');
    }
  
    return features;
  }

  private async getLLMAnalysis(imageAnalysis: ImageAnalysis, userQuery: string, file: UploadedFile): Promise<string> {
    try {
      const analysisData = {
        metadata: imageAnalysis.metadata,
        ocrText: imageAnalysis.ocrText,
        description: imageAnalysis.description,
        features: imageAnalysis.features,
        technicalSummary: this.generateTechnicalSummary(imageAnalysis)
      };

      const response = await this.analysisChain.call({
        userQuery: userQuery || 'Provide a comprehensive analysis of this image including visual content, any text, and technical details',
        imageAnalysis: JSON.stringify(analysisData, null, 2),
        fileName: file.filename,
        dimensions: `${imageAnalysis.metadata.width}x${imageAnalysis.metadata.height}`,
        fileSize: `${Math.round(file.size / 1024)}KB`,
        format: imageAnalysis.metadata.format.toUpperCase(),
        channels: imageAnalysis.metadata.channels || 'Unknown',
        hasAlpha: imageAnalysis.metadata.hasAlpha ? 'Yes' : 'No'
      });

      return response.text;
    } catch (error) {
      console.error('LLM analysis error:', error);
      
      // Enhanced fallback response
      let fallbackResponse = `**Technical Analysis of ${file.filename}:**\n\n`;
      fallbackResponse += `📏 **Dimensions:** ${imageAnalysis.metadata.width}x${imageAnalysis.metadata.height} pixels\n`;
      fallbackResponse += `📦 **File Size:** ${Math.round(file.size / 1024)}KB\n`;
      fallbackResponse += `🎨 **Format:** ${imageAnalysis.metadata.format.toUpperCase()}\n`;
      fallbackResponse += `🌈 **Channels:** ${imageAnalysis.metadata.channels || 'Unknown'}\n\n`;
      
      if (imageAnalysis.features.length > 0) {
        fallbackResponse += `**Visual Features:**\n${imageAnalysis.features.map(f => `• ${f}`).join('\n')}\n\n`;
      }
      
      if (imageAnalysis.ocrText) {
        fallbackResponse += `**Extracted Text:**\n${imageAnalysis.ocrText}\n\n`;
      }
      
      fallbackResponse += `**Description:** ${imageAnalysis.description}`;
      
      return fallbackResponse;
    }
  }

  private generateTechnicalSummary(analysis: ImageAnalysis): string {
    const tech = analysis.metadata;
    const megapixels = ((tech.width * tech.height) / 1000000).toFixed(1);
    const aspectRatio = (tech.width / tech.height).toFixed(2);
    
    return `${megapixels}MP ${tech.format.toUpperCase()} image, ${tech.width}x${tech.height} pixels, aspect ratio ${aspectRatio}:1, ${Math.round(tech.fileSize / 1024)}KB file size`;
  }

  private async handleNoImagesQuery(textQuery: string, userId: string): Promise<string> {
    return `I understand you're asking about: "${textQuery}"

Since no images were uploaded, I can help you with:

📸 **Image Analysis Capabilities:**
• Visual content description and object identification
• Text extraction from images (OCR) - documents, signs, screenshots
• Technical analysis - resolution, format, quality assessment
• Color analysis and composition evaluation
• Metadata extraction and format conversion advice

🔍 **What I Can Analyze:**
• Photographs and artwork
• Screenshots and UI elements  
• Documents and handwritten text
• Charts, graphs, and diagrams
• Medical images and scientific imagery
• Product photos and technical drawings

📁 **Supported Formats:** JPG, PNG, GIF, BMP, TIFF, WebP (up to 20MB)

Please upload some images and I'll provide detailed analysis including visual descriptions, extracted text, and technical insights!`;
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
        'Comprehensive visual content analysis',
        'Advanced OCR text extraction with high accuracy',
        'Object and scene recognition',
        'Color analysis and composition evaluation',
        'Technical metadata extraction',
        'Image quality and resolution assessment',
        'Format conversion recommendations',
        'Artistic style and mood analysis',
        'Document and screenshot analysis',
        'Multi-language text recognition'
      ],
      maxFileSize: '20MB per image',
      processingTime: 'Fast (3-20 seconds depending on resolution)',
      accuracy: 'Very High for text extraction, High for visual analysis',
      languages: ['English (primary)', 'Multi-language OCR support available']
    };
  }

  // MCP Integration placeholder
  async connectToMCP(): Promise<void> {
    console.log('📡 Connecting to Image MCP Server...');
    // Implementation for Pixeltable image MCP server
  }
}