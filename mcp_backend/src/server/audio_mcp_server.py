import asyncio
import logging
import sys
import traceback
from typing import Any, Sequence
import tempfile
import os
from pathlib import Path

try:
    from mcp.server.models import InitializationOptions
    from mcp.server import NotificationOptions, Server
    from mcp.server.stdio import stdio_server
    from mcp.types import (
        CallToolRequest,
        CallToolResult,
        ListToolsRequest,
        TextContent,
        Tool,
    )
except ImportError as e:
    print(f"ERROR: Failed to import MCP modules: {e}")
    print("Please install MCP: pip install mcp")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("audio-mcp-server")

class AudioMCPServer:
    def __init__(self):
        try:
            self.server = Server("audio-pixeltable-server")
            self.setup_handlers()
            logger.info("AudioMCPServer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AudioMCPServer: {e}")
            raise
        
    def setup_handlers(self):
        @self.server.list_tools()
        async def handle_list_tools() -> list[Tool]:
            logger.info("Listing available tools")
            return [
                Tool(
                    name="process_audio",
                    description="Process audio files using Pixeltable",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "audio_path": {"type": "string", "description": "Path to audio file"},
                            "operation": {"type": "string", "description": "Operation: transcribe, analyze, extract_features"}
                        },
                        "required": ["audio_path"]
                    }
                ),
                Tool(
                    name="store_audio",
                    description="Store audio in Pixeltable database",
                    inputSchema={
                        "type": "object", 
                        "properties": {
                            "audio_path": {"type": "string"},
                            "metadata": {"type": "object"}
                        },
                        "required": ["audio_path"]
                    }
                )
            ]

        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
            logger.info(f"Calling tool: {name} with arguments: {arguments}")
            try:
                if name == "process_audio":
                    return await self.process_audio(arguments)
                elif name == "store_audio":
                    return await self.store_audio(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.error(f"Tool error: {e}")
                return [TextContent(type="text", text=f"Error: {str(e)}")]

    async def process_audio(self, args: dict) -> list[TextContent]:
        audio_path = args.get("audio_path")
        operation = args.get("operation", "transcribe")
        
        logger.info(f"Processing audio: {audio_path} with operation: {operation}")
        
        try:
            # Validate audio path
            if not audio_path:
                raise ValueError("Audio path is required")
            
            # Mock audio processing (replace with actual Pixeltable logic)
            if operation == "transcribe":
                result = f"Transcribed audio from {audio_path}: 'Sample transcription text'"
            elif operation == "analyze":
                result = f"Audio analysis for {audio_path}: Duration: 30s, Format: MP3, Sample Rate: 44.1kHz"
            elif operation == "extract_features":
                result = f"Audio features for {audio_path}: Tempo: 120 BPM, Key: C Major, Energy: 0.8"
            else:
                result = f"Processed audio {audio_path} with operation: {operation}"
            
            logger.info(f"Audio processing completed: {result}")
            return [TextContent(type="text", text=result)]
            
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
            return [TextContent(type="text", text=f"Audio processing error: {str(e)}")]

    async def store_audio(self, args: dict) -> list[TextContent]:
        audio_path = args.get("audio_path")
        metadata = args.get("metadata", {})
        
        logger.info(f"Storing audio: {audio_path} with metadata: {metadata}")
        
        try:
            # Validate audio path
            if not audio_path:
                raise ValueError("Audio path is required")
            
            # Mock storage (replace with actual Pixeltable storage)
            result = f"Stored audio {audio_path} with metadata: {metadata}"
            logger.info(f"Audio storage completed: {result}")
            return [TextContent(type="text", text=result)]
            
        except Exception as e:
            logger.error(f"Storage error: {e}")
            return [TextContent(type="text", text=f"Storage error: {str(e)}")]

async def main():
    try:
        logger.info("🎵 Starting Audio MCP Server...")
        logger.info("Server will communicate via STDIO")
        
        server_instance = AudioMCPServer()
        
        logger.info("Setting up STDIO server connection...")
        async with stdio_server() as (read_stream, write_stream):
            logger.info("STDIO connection established, starting server...")
            await server_instance.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="audio-pixeltable-server",
                    server_version="1.0.0",
                    capabilities=server_instance.server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        logger.info("Starting Audio MCP Server main function...")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Audio MCP Server stopped")
    except Exception as e:
        logger.error(f"Critical error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)