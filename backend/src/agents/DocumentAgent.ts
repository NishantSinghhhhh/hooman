// backend/agents/DocumentAgent.ts
import { OpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { promises as fs } from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse'; 
import { QueryIngestionService } from '../services/queryIngestionService';
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
You are an expert document analyst with advanced comprehension capabilities. Analyze the provided document content and provide detailed, actionable insights.

User Question: {userQuery}

Document Content:
{documentContent}

Document Metadata:
- File Name: {fileName}
- File Type: {fileType}
- Content Length: {contentLength} characters
- Word Count: {wordCount} words
- Processing Date: {processingDate}

ANALYSIS INSTRUCTIONS:
1. **Content Understanding**: Thoroughly read and comprehend the entire document
2. **Question Response**: Provide a direct, comprehensive answer to the user's specific question
3. **Evidence Citation**: Quote relevant sections with proper context
4. **Key Insights**: Extract and highlight important findings, data points, and conclusions
5. **Structure Analysis**: Identify document organization, sections, and hierarchy
6. **Missing Information**: If the question cannot be fully answered, explain what additional information would be needed
7. **Actionable Recommendations**: Suggest next steps or actions based on the document content

Response Structure:
1. **Direct Answer**: Address the user's question immediately
2. **Supporting Evidence**: Relevant quotes and references from the document
3. **Key Findings**: Important insights and data points
4. **Document Summary**: Brief overview of main topics and themes
5. **Recommendations**: Suggested actions or further analysis needed

Response:
`);

    this.summaryPrompt = PromptTemplate.fromTemplate(`
Create a comprehensive, structured summary of this document:

Document: {fileName}
Content: {documentContent}
Word Count: {wordCount}

Provide a detailed summary that includes:

**EXECUTIVE SUMMARY:**
- Primary purpose and main thesis
- Key conclusions and recommendations

**MAIN TOPICS & THEMES:**
- Core subjects covered
- Important concepts and definitions

**KEY FINDINGS & DATA:**
- Statistical information and metrics
- Important facts and figures
- Research results or conclusions

**STRUCTURE & ORGANIZATION:**
- Document sections and chapters
- Logical flow and organization

**ACTIONABLE INSIGHTS:**
- Practical applications
- Recommended next steps
- Areas requiring further investigation

**SIGNIFICANCE:**
- Why this document matters
- Target audience and use cases

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
    const startTime = Date.now();
    
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
            console.log(`📖 Processing document: ${file.filename}`);
            const docContent = await this.extractDocumentContent(file);
            const documentAnalysis = await this.createDocumentAnalysis(docContent, file);
            const llmAnalysis = await this.analyzeDocument(docContent, textQuery || '', file);
            
            processedFiles.push({
              fileName: file.filename,
              fileType: file.mimetype,
              status: 'processed',
              analysis: documentAnalysis,
              response: llmAnalysis
            });
            
            response += `\n\n**Analysis of ${file.filename}:**\n${llmAnalysis}`;
            
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

      const agentResponse: AgentResponse = {
        success: true,
        response: response.trim(),
        agentType: 'document',
        processedFiles: processedFiles,
        capabilities: this.getCapabilities(),
        metadata: {
          processingTime: Date.now() - startTime,
          fileCount: files.length,
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
      console.error('❌ Document Agent error:', error);
      
      const errorResponse: AgentResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        response: "I encountered an error while processing your document query. Please try again or contact support if the issue persists.",
        agentType: 'document'
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

  private async extractDocumentContent(file: UploadedFile): Promise<string> {
    const filePath = file.path;
    const fileType = file.mimetype;

    try {
      console.log(`📊 Extracting content from ${fileType} file...`);
      
      if (fileType === 'application/pdf') {
        // Extract PDF content
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(dataBuffer);
        console.log(`✅ PDF extraction completed: ${pdfData.text.length} characters`);
        return pdfData.text;
      } 
      else if (fileType === 'text/plain' || 
               fileType === 'application/json' ||
               fileType === 'text/csv' ||
               fileType === 'text/markdown' ||
               fileType === 'application/rtf') {
        // Read text files
        const content = await fs.readFile(filePath, 'utf8');
        console.log(`✅ Text extraction completed: ${content.length} characters`);
        return content;
      }
      else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For Word docs, you'd need additional libraries like mammoth
        throw new Error('Word document processing requires additional setup. Please convert to PDF or plain text format.');
      }
      else if (fileType === 'application/vnd.ms-excel' || 
               fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        throw new Error('Excel document processing requires additional setup. Please convert to CSV format.');
      }
      else {
        // Try to read as text
        console.log(`⚠️ Unknown file type, attempting text extraction...`);
        const content = await fs.readFile(filePath, 'utf8');
        return content;
      }
    } catch (error) {
      throw new Error(`Failed to extract content from ${file.filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createDocumentAnalysis(content: string, file: UploadedFile): Promise<DocumentAnalysis> {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const language = this.detectLanguage(content);
    
    return {
      fileName: file.filename,
      fileType: file.mimetype,
      content: content,
      summary: content.length > 500 ? await this.generateQuickSummary(content, file.filename) : content,
      wordCount: wordCount,
      language: language,
      extractedData: {
        characterCount: content.length,
        paragraphCount: content.split('\n\n').length,
        averageWordsPerSentence: this.calculateAverageWordsPerSentence(content),
        readingTimeMinutes: Math.ceil(wordCount / 200), // Average reading speed
        fileSize: file.size,
        processingDate: new Date().toISOString()
      }
    };
  }

  private detectLanguage(content: string): string {
    // Simple language detection - can be enhanced with proper language detection library
    const englishWords = ['the', 'and', 'of', 'to', 'a', 'in', 'is', 'it', 'you', 'that'];
    const words = content.toLowerCase().split(/\s+/).slice(0, 100);
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    
    return englishWordCount > 5 ? 'English' : 'Unknown';
  }

  private calculateAverageWordsPerSentence(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = content.split(/\s+/).filter(word => word.length > 0).length;
    return sentences.length > 0 ? Math.round(totalWords / sentences.length) : 0;
  }

  private async generateQuickSummary(content: string, fileName: string): Promise<string> {
    try {
      // Generate a quick summary for the document analysis
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      const summary = await this.summaryChain.call({
        fileName: fileName,
        documentContent: content.substring(0, 8000), // Limit for summary
        wordCount: wordCount
      });

      return summary.text;
    } catch (error) {
      console.error('Quick summary error:', error);
      return `Document containing ${content.length} characters. Summary generation failed.`;
    }
  }

  private async analyzeDocument(content: string, userQuery: string, fileInfo: UploadedFile): Promise<string> {
    try {
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      const analysis = await this.analysisChain.call({
        userQuery: userQuery || 'Provide a comprehensive analysis of this document including key insights, main topics, and actionable recommendations',
        documentContent: content.substring(0, 12000), // Increased limit for better analysis
        fileName: fileInfo.filename,
        fileType: this.getReadableFileType(fileInfo.mimetype),
        contentLength: content.length,
        wordCount: wordCount,
        processingDate: new Date().toLocaleString()
      });

      return analysis.text;
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Enhanced fallback analysis
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      const readingTime = Math.ceil(wordCount / 200);
      
      let fallbackResponse = `**Document Analysis: ${fileInfo.filename}**\n\n`;
      fallbackResponse += `📊 **Document Statistics:**\n`;
      fallbackResponse += `• File Type: ${this.getReadableFileType(fileInfo.mimetype)}\n`;
      fallbackResponse += `• Content Length: ${content.length.toLocaleString()} characters\n`;
      fallbackResponse += `• Word Count: ${wordCount.toLocaleString()} words\n`;
      fallbackResponse += `• Estimated Reading Time: ${readingTime} minutes\n\n`;
      
      // Extract first few paragraphs as preview
      const preview = content.substring(0, 500).trim();
      if (preview) {
        fallbackResponse += `**Content Preview:**\n${preview}${content.length > 500 ? '...' : ''}\n\n`;
      }
      
      fallbackResponse += `**Analysis Note:** Advanced analysis temporarily unavailable. Please try again or contact support if the issue persists.`;
      
      return fallbackResponse;
    }
  }

  private getReadableFileType(mimetype: string): string {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF Document',
      'text/plain': 'Plain Text',
      'text/csv': 'CSV Spreadsheet',
      'application/json': 'JSON Data',
      'text/markdown': 'Markdown Document',
      'application/rtf': 'Rich Text Format',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Microsoft Word Document',
      'application/vnd.ms-excel': 'Microsoft Excel Spreadsheet',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Microsoft Excel Spreadsheet'
    };
    
    return typeMap[mimetype] || mimetype;
  }

  private async handleTextOnlyQuery(textQuery: string, userId: string): Promise<string> {
    return `I understand you're asking: **"${textQuery}"**

Since no documents were uploaded, I can assist you with comprehensive document analysis in these ways:

📄 **Document Processing Capabilities:**
• **PDF Analysis** - Extract and analyze text from PDF documents
• **Text Document Processing** - Plain text, Markdown, RTF files
• **Data File Analysis** - CSV, JSON, and structured data files
• **Content Summarization** - Generate executive summaries and key insights
• **Question Answering** - Answer specific questions based on document content
• **Multi-Document Comparison** - Compare and contrast multiple documents

🔍 **What I Can Extract:**
• Key themes and main topics
• Important data points and statistics
• Actionable recommendations and insights
• Document structure and organization
• Executive summaries and abstracts
• Specific information based on your questions

📁 **Supported Formats:**
• PDF documents (up to 10MB)
• Plain text files (.txt, .md)
• CSV data files
• JSON documents
• RTF documents

💡 **Pro Tips:**
• Upload multiple related documents for comparative analysis
• Ask specific questions to get targeted insights
• Request summaries for quick overviews of lengthy documents

Please upload your documents and I'll provide detailed analysis, answer your questions, and extract key insights to help with your research or decision-making!`;
  }

  async generateSummary(content: string, fileName: string): Promise<string> {
    try {
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      const summary = await this.summaryChain.call({
        fileName: fileName,
        documentContent: content.substring(0, 8000), // Limit for summary
        wordCount: wordCount
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
        'text/markdown',
        'application/rtf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      capabilities: [
        'Advanced document content extraction and parsing',
        'Intelligent text analysis and comprehension',
        'Executive summary generation',
        'Question answering from document content',
        'Multi-document comparison and analysis',
        'Content search and information retrieval',
        'PDF text extraction with high accuracy',
        'Structured data analysis (CSV, JSON)',
        'Document statistics and readability analysis',
        'Key insight extraction and recommendations'
      ],
      maxFileSize: '10MB per document',
      processingTime: 'Medium (5-45 seconds depending on document length)',
      accuracy: 'Very High for text extraction, High for analysis',
      languages: ['English (primary)', 'Multi-language support available']
    };
  }

  // MCP Integration placeholder
  async connectToMCP(): Promise<void> {
    console.log('📡 Connecting to Document MCP Server...');
    // Implementation for Pixeltable document MCP server
  }
}