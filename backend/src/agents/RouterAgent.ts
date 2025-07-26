// backend/agents/RouterAgent.ts
import { OpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import * as mime from 'mime-types';
import {
  QueryData,
  QueryClassification,
  RoutingDecision,
  AgentConfig,
  UploadedFile
} from '../types/agent';
import dotenv from 'dotenv';
dotenv.config();
export class RouterAgent {
  private llm: OpenAI | ChatOllama;
  private classificationPrompt: PromptTemplate;
  private chain: LLMChain;

  constructor(config: AgentConfig = {}) {
    // Initialize LLM (can use OpenAI or Ollama)
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

    this.classificationPrompt = PromptTemplate.fromTemplate(`
    You are a query classification system. Analyze the user's query and uploaded files to determine which specialized agent should handle it.

    User Query: {textQuery}
    Number of Files: {fileCount}
    File Types: {fileTypes}
    File Names: {fileNames}

    Analyze this input and classify it into one of these categories:
    1. DOCUMENT - Text files, PDFs, Word docs, or text-heavy queries
    2. IMAGE - Image files, visual analysis, OCR requests
    3. VIDEO - Video files, video analysis, transcription requests
    4. AUDIO - Audio files, speech transcription, audio analysis
    5. TEXT - Pure text queries with no files

    Return your response as a JSON object with this exact format:
    {{
        "classification": "DOCUMENT|IMAGE|VIDEO|AUDIO|TEXT",
        "agentType": "document|image|video|audio",
        "reasoning": "Brief explanation of your classification decision",
        "priority": "high|medium|low",
        "confidence": 0.95
    }}

    Focus on the primary file type if multiple types are present. Consider the user's intent from their text query.
`);

    this.chain = new LLMChain({
      llm: this.llm,
      prompt: this.classificationPrompt
    });
  }

  async classifyQuery(queryData: QueryData): Promise<QueryClassification> {
    try {
      const { textQuery = '', files = [], userId } = queryData;
      
      // Analyze file types
      const fileTypes = files.map(file => 
        file.mimetype || mime.lookup(file.filename) || 'unknown'
      );
      const fileNames = files.map(file => file.filename || 'unknown');
      
      console.log('🔍 Classifying query:', {
        textQuery: textQuery.substring(0, 100),
        fileCount: files.length,
        fileTypes
      });

      // Get classification from LLM
      const response = await this.chain.call({
        textQuery: textQuery || 'No text query provided',
        fileCount: files.length,
        fileTypes: fileTypes.join(', '),
        fileNames: fileNames.join(', ')
      });

      // Parse the response
      let classification: QueryClassification;
      try {
        // Extract JSON from response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          classification = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.warn('Failed to parse LLM response, using fallback classification');
        classification = this.getFallbackClassification(files, textQuery);
      }

      // Validate and enhance classification
      classification = this.validateClassification(classification, files, textQuery);
      
      console.log('✅ Query classified:', classification);
      return classification;

    } catch (error) {
      console.error('❌ Router Agent classification error:', error);
      return this.getFallbackClassification(queryData.files || [], queryData.textQuery || '');
    }
  }

  private getFallbackClassification(files: UploadedFile[] = [], textQuery: string = ''): QueryClassification {
    if (files.length === 0) {
      return {
        classification: 'TEXT',
        agentType: 'document',
        reasoning: 'No files provided, treating as text query',
        priority: 'medium',
        confidence: 0.8
      };
    }

    // Simple file type classification
    const fileTypes = files.map(file => 
      file.mimetype || mime.lookup(file.filename)
    );
    
    if (fileTypes.some(type => type && type.startsWith('image/'))) {
      return {
        classification: 'IMAGE',
        agentType: 'image',
        reasoning: 'Image files detected',
        priority: 'high',
        confidence: 0.9
      };
    }
    
    if (fileTypes.some(type => type && type.startsWith('video/'))) {
      return {
        classification: 'VIDEO',
        agentType: 'video',
        reasoning: 'Video files detected',
        priority: 'high',
        confidence: 0.9
      };
    }
    
    if (fileTypes.some(type => type && type.startsWith('audio/'))) {
      return {
        classification: 'AUDIO',
        agentType: 'audio',
        reasoning: 'Audio files detected',
        priority: 'medium',
        confidence: 0.9
      };
    }

    return {
      classification: 'DOCUMENT',
      agentType: 'document',
      reasoning: 'Document or unknown file types detected',
      priority: 'medium',
      confidence: 0.7
    };
  }

  private validateClassification(
    classification: QueryClassification, 
    files: UploadedFile[], 
    textQuery: string
  ): QueryClassification {
    const validAgentTypes: Array<QueryClassification['agentType']> = ['document', 'image', 'video', 'audio'];
    const validPriorities: Array<QueryClassification['priority']> = ['high', 'medium', 'low'];
    
    // Ensure valid agent type
    if (!validAgentTypes.includes(classification.agentType)) {
      classification.agentType = 'document';
    }
    
    // Ensure valid priority
    if (!validPriorities.includes(classification.priority)) {
      classification.priority = 'medium';
    }
    
    // Ensure confidence is a number between 0 and 1
    if (typeof classification.confidence !== 'number' || 
        classification.confidence < 0 || 
        classification.confidence > 1) {
      classification.confidence = 0.8;
    }
    
    // Add metadata
    classification.fileCount = files.length;
    classification.hasTextQuery = Boolean(textQuery && textQuery.trim().length > 0);
    classification.timestamp = new Date().toISOString();
    
    return classification;
  }

  getAgentMapping(): Record<string, string> {
    return {
      'document': 'DocumentAgent',
      'image': 'ImageAgent',
      'video': 'VideoAgent',
      'audio': 'AudioAgent'
    };
  }

  routeToAgent(classification: QueryClassification): RoutingDecision {
    const agentMapping = this.getAgentMapping();
    const targetAgent = agentMapping[classification.agentType] || 'DocumentAgent';
    
    console.log(`🚀 Routing to: ${targetAgent}`);
    console.log(`📝 Reasoning: ${classification.reasoning}`);
    
    return {
      targetAgent,
      classification,
      routingDecision: {
        agent: targetAgent,
        priority: classification.priority,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      }
    };
  }
}
