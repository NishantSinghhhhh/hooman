// backend/agents/DocumentAgent.ts
import { OpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { promises as fs } from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse'; 
import {
  QueryData,
  AgentResponse,
  AgentConfig,
  AgentCapabilities,
  ProcessedFile,
  DocumentAnalysis,
  UploadedFile
} from '../types/agent';

export class DocumentAgent {
  private llm: OpenAI | ChatOllama;
  private analysisPrompt: PromptTemplate;
  private summaryPrompt: PromptTemplate;
  private analysisChain: LLMChain;
  private summaryChain: LLMChain;

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
You are a document analysis expert. Analyze the provided document content and answer the user's question.

User Question: {userQuery}

Document Content:
{documentContent}

Document Metadata:
- File Name: {fileName}
- File Type: {fileType}
- Content Length: {contentLength} characters

Instructions:
1. Carefully read and understand the document content
2. Answer the user's question based on the document information
3. Quote relevant sections when possible
4. If the question cannot be answered from the document, explain what information is missing
5. Provide a comprehensive and helpful response

Response:
`);

    this.summaryPrompt = PromptTemplate.fromTemplate(`
Provide a comprehensive summary of this document:

Document: {fileName}
Content: {documentContent}

Create a summary that includes:
1. Main topics and themes
2. Key points and findings
3. Important details and data
4. Overall structure and organization

Summary:
`);

    this.analysisChain = new LLMChain({
      llm: this.llm,
      prompt: this.analysisPrompt
    });

    this.summaryChain = new LLMChain({
      llm: this.llm,
      prompt: this.summaryPrompt
    });
  }

  async processQuery(queryData: QueryData): Promise<AgentResponse> {
    try {
      const { textQuery, files = [], userId } = queryData;
      
      console.log('📄 Document Agent processing query...');
      console.log(`📝 Query: ${textQuery}`);
      console.log(`📁 Files: ${files.length}`);

      let response = '';
      const processedFiles: ProcessedFile[] = [];

      if (files.length === 0) {
        // Handle text-only queries
        response = await this.handleTextOnlyQuery(textQuery || '', userId);
      } else {
        // Process document files
        for (const file of files) {
          try {
            const docContent = await this.extractDocumentContent(file);
            const analysis = await this.analyzeDocument(docContent, textQuery || '', file);
            
            processedFiles.push({
              fileName: file.filename,
              fileType: file.mimetype,
              status: 'processed',
              analysis: analysis,
              response: analysis
            });
            
            response += `\n\n**Analysis of ${file.filename}:**\n${analysis}`;
            
          } catch (fileError) {
            console.error(`Error processing file ${file.filename}:`, fileError);
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
        agentType: 'document',
        processedFiles: processedFiles,
        capabilities: this.getCapabilities(),
        metadata: {
          processingTime: Date.now(),
          fileCount: files.length,
          userId: userId
        }
      };

    } catch (error) {
      console.error('❌ Document Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response: "I encountered an error while processing your document query. Please try again or contact support if the issue persists.",
        agentType: 'document'
      };
    }
  }

  private async extractDocumentContent(file: UploadedFile): Promise<string> {
    const filePath = file.path;
    const fileType = file.mimetype;

    try {
      if (fileType === 'application/pdf') {
        // Extract PDF content
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(dataBuffer);
        return pdfData.text;
      } 
      else if (fileType === 'text/plain' || 
               fileType === 'application/json' ||
               fileType === 'text/csv') {
        // Read text files
        return await fs.readFile(filePath, 'utf8');
      }
      else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For Word docs, you'd need additional libraries like mammoth
        throw new Error('Word document processing not yet implemented');
      }
      else {
        // Try to read as text
        return await fs.readFile(filePath, 'utf8');
      }
    } catch (error) {
      throw new Error(`Failed to extract content from ${file.filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async analyzeDocument(content: string, userQuery: string, fileInfo: UploadedFile): Promise<string> {
    try {
      const analysis = await this.analysisChain.call({
        userQuery: userQuery || 'Provide a comprehensive analysis of this document',
        documentContent: content.substring(0, 10000), // Limit content length
        fileName: fileInfo.filename,
        fileType: fileInfo.mimetype,
        contentLength: content.length
      });

      return analysis.text;
    } catch (error) {
      console.error('Analysis error:', error);
      return `Error analyzing document: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async handleTextOnlyQuery(textQuery: string, userId: string): Promise<string> {
    // For text-only queries, we can search existing documents or provide general assistance
    return `I understand you're asking: "${textQuery}"

Since no documents were uploaded, I can help you in these ways:
1. Upload documents (PDF, TXT, CSV) for me to analyze
2. Ask me to search through previously uploaded documents
3. Provide general information about document analysis

What would you like me to help you with regarding document analysis?`;
  }

  async generateSummary(content: string, fileName: string): Promise<string> {
    try {
      const summary = await this.summaryChain.call({
        fileName: fileName,
        documentContent: content.substring(0, 8000) // Limit for summary
      });

      return summary.text;
    } catch (error) {
      console.error('Summary error:', error);
      return `Error generating summary: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  getCapabilities(): AgentCapabilities {
    return {
      agentType: 'document',
      supportedFormats: [
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/json',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      capabilities: [
        'Document content extraction',
        'Text analysis and summarization',
        'Question answering from documents',
        'Multi-document comparison',
        'Content search and indexing',
        'PDF text extraction'
      ],
      maxFileSize: '10MB',
      processingTime: 'Medium (5-30 seconds)',
      languages: ['English', 'Multi-language support']
    };
  }

  // MCP Integration placeholder
  async connectToMCP(): Promise<void> {
    // This would connect to your Pixeltable MCP server
    console.log('📡 Connecting to Document MCP Server...');
    // Implementation depends on your MCP server setup
  }
}