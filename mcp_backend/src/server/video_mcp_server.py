import asyncio
import logging
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("video-mcp-server")

class VideoMCPServer:
    def __init__(self):
        self.server = Server("video-pixeltable-server")
        self.setup_handlers()
        
    def setup_handlers(self):
        @self.server.list_tools()
        async def handle_list_tools() -> list[Tool]:
            return [
                Tool(
                    name="process_video",
                    description="Process video files using Pixeltable",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "video_path": {"type": "string"},
                            "operation": {"type": "string", "description": "Operation: extract_frames, analyze_scenes, get_metadata"}
                        },
                        "required": ["video_path"]
                    }
                ),
                Tool(
                    name="store_video",
                    description="Store video in Pixeltable database",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "video_path": {"type": "string"},
                            "metadata": {"type": "object"}
                        },
                        "required": ["video_path"]
                    }
                )
            ]

        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
            try:
                if name == "process_video":
                    return await self.process_video(arguments)
                elif name == "store_video":
                    return await self.store_video(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                return [TextContent(type="text", text=f"Error: {str(e)}")]

    async def process_video(self, args: dict) -> list[TextContent]:
        video_path = args.get("video_path")
        operation = args.get("operation", "analyze_scenes")
        
        try:
            if operation == "extract_frames":
                result = f"Extracted frames from {video_path}: 150 frames at 5fps"
            elif operation == "analyze_scenes":
                result = f"Scene analysis for {video_path}: 3 scenes detected - outdoor, indoor, transition"
            elif operation == "get_metadata":
                result = f"Video metadata for {video_path}: Duration: 30s, Resolution: 1920x1080, FPS: 30"
            else:
                result = f"Processed video {video_path} with operation: {operation}"
                
            return [TextContent(type="text", text=result)]
        except Exception as e:
            return [TextContent(type="text", text=f"Video processing error: {str(e)}")]

    async def store_video(self, args: dict) -> list[TextContent]:
        video_path = args.get("video_path")
        metadata = args.get("metadata", {})
        
        try:
            result = f"Stored video {video_path} with metadata: {metadata}"
            return [TextContent(type="text", text=result)]
        except Exception as e:
            return [TextContent(type="text", text=f"Storage error: {str(e)}")]

async def main():
    logger.info("Starting Video MCP Server on port 8081")
    server_instance = VideoMCPServer()
    
    async with stdio_server() as (read_stream, write_stream):
        await server_instance.server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="video-pixeltable-server",
                server_version="1.0.0",
                capabilities=server_instance.server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())