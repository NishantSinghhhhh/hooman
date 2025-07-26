// backend/services/MCPServerAdapter.ts

import fetch from 'node-fetch';  // or global fetch if available in your Node version
import FormData from 'form-data';  // Use form-data npm package in Node.js environment
import { MCPProcessResponse } from '@/types/agent';
export interface MCPServerConfig {
  url: string;                    // Base URL of the MCP server (e.g. "http://localhost:8080")
  transport: 'sse' | 'stdio';     // Transport method (for future use)
  name: string;                   // Name of the MCP server ("audio", "image", etc.)
  description?: string;           // Optional description
}

export class MCPServerAdapter {
  private serverUrl: string;
  private serverType: 'document' | 'image' | 'video' | 'audio';
  // Placeholder for actual connection object if needed
  private connection: any;

  constructor(config: MCPServerConfig, serverType: 'document' | 'image' | 'video' | 'audio') {
    this.serverUrl = config.url;
    this.serverType = serverType;
    this.connection = null; // Initialize as needed
  }

  async connectToServer(): Promise<void> {
    console.log(`📡 Connecting to ${this.serverType} MCP Server at ${this.serverUrl}`);
    // Initialize MCP connection here if necessary, currently placeholder
    // e.g. this.connection = await MCPConnection.connect(this.serverUrl);
  }

  /**
   * Process audio file with specified operations on the MCP server.
   * @param audioFile - Blob, File, or Readable stream representing audio file
   * @param operations - List of operations to perform, e.g., ["transcribe", "extract_embeddings"]
   * @returns Parsed JSON response from MCP Server
   */
  async processAudio(audioFile: Blob | Buffer | any, operations: string[]): Promise<any> {
    console.log(`🔊 Sending audio to MCP server for processing: ${operations.join(', ')}`);

    const formData = new FormData();

    // Append audio file - adapt if `audioFile` is a Node.js Buffer or ReadableStream
    formData.append('file', audioFile, (audioFile as any).filename || 'audiofile');

    // Operations as JSON string
    formData.append('operations', JSON.stringify(operations));

    try {
      const response = await fetch(`${this.serverUrl}/process-audio`, {
        method: 'POST',
        body: formData as any, // Type assertion to satisfy node-fetch
        // Do NOT set Content-Type here; form-data handles headers automatically
      });

      if (!response.ok) {
        throw new Error(`MCP Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ MCP Server audio processing completed');
      return result;
    } catch (error) {
      console.error('❌ MCP Server audio processing failed:', error);
      throw error;
    }
  }

  // Similarly, you can add other methods for documents, images, videos:

  async processImage(imageFile: Blob | Buffer | any, operations: string[]): Promise<any> {
    console.log(`🖼️ Sending image to MCP server for processing: ${operations.join(', ')}`);

    const formData = new FormData();
    formData.append('file', imageFile, (imageFile as any).filename || 'imagefile');
    formData.append('operations', JSON.stringify(operations));

    try {
      const response = await fetch(`${this.serverUrl}/process-image`, {
        method: 'POST',
        body: formData as any,
      });

      if (!response.ok) {
        throw new Error(`MCP Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ MCP Server image processing completed');
      return result;
    } catch (error) {
      console.error('❌ MCP Server image processing failed:', error);
      throw error;
    }
  }

  async processVideo(videoFile: Blob | Buffer | any, operations: string[]): Promise<any> {
    console.log(`🎞️ Sending video to MCP server for processing: ${operations.join(', ')}`);

    const formData = new FormData();
    formData.append('file', videoFile, (videoFile as any).filename || 'videofile');
    formData.append('operations', JSON.stringify(operations));

    try {
      const response = await fetch(`${this.serverUrl}/process-video`, {
        method: 'POST',
        body: formData as any,
      });

      if (!response.ok) {
        throw new Error(`MCP Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ MCP Server video processing completed');
      return result;
    } catch (error) {
      console.error('❌ MCP Server video processing failed:', error);
      throw error;
    }
  }

  async processDocument(docFile: Blob | Buffer | any, operations: string[]): Promise<any> {
    console.log(`📄 Sending document to MCP server for processing: ${operations.join(', ')}`);

    const formData = new FormData();
    formData.append('file', docFile, (docFile as any).filename || 'documentfile');
    formData.append('operations', JSON.stringify(operations));

    try {
      const response = await fetch(`${this.serverUrl}/process-document`, {
        method: 'POST',
        body: formData as any,
      });

      if (!response.ok) {
        throw new Error(`MCP Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ MCP Server document processing completed');
      return result;
    } catch (error) {
      console.error('❌ MCP Server document processing failed:', error);
      throw error;
    }
  }

  // Add additional helper methods as needed, such as storing analysis results, performing searches, etc.

  async storeAnalysis(analysisData: any, embeddings: number[]): Promise<string> {
    try {
      const payload = {
        analysis: analysisData,
        embeddings,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${this.serverUrl}/store-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to store analysis: ${response.statusText}`);
      }
      const result = await response.json() as MCPProcessResponse;

      return result.id;
    } catch (err) {
      console.error('❌ Failed to store analysis:', err);
      throw err;
    }
  }

  async searchSimilar(embeddings: number[], limit = 10): Promise<any[]> {
    try {
      const response = await fetch(`${this.serverUrl}/search-similar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeddings, limit })
      });
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      const result = await response.json() as MCPProcessResponse;

      return result.matches || [];
    } catch (err) {
      console.error('❌ Failed to perform similarity search:', err);
      return [];
    }
  }
}
