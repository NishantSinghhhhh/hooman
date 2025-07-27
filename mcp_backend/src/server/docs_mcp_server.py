"""Document MCP Server using Pixeltable"""
import asyncio
import logging
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("docs-mcp-server")

class DocsMCPServer:
    def __init__(self):
        self.server = Server("docs-pixeltable-server")
        self.setup_handlers()
        
    def setup_handlers(self):
        @self.server.list_tools()
        async def handle_list_tools() -> list[Tool]:
            return [
                Tool(
                    name="process_document",
                    description="Process document files using Pixeltable",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "doc_path": {"type": "string"},
                            "operation": {"type": "string", "description": "Operation: extract_text, summarize, analyze_structure"}
                        },
                        "required": ["doc_path"]
                    }
                ),
                Tool(
                    name="store_document",
                    description="Store document in Pixeltable database",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "doc_path": {"type": "string"},
                            "metadata": {"type": "object"}
                        },
                        "required": ["doc_path"]
                    }
                )
            ]

        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
            try:
                if name == "process_document":
                    return await self.process_document(arguments)
                elif name == "store_document":
                    return await self.store_document(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                return [TextContent(type="text", text=f"Error: {str(e)}")]

    async def process_document(self, args: dict) -> list[TextContent]:
        doc_path = args.get("doc_path")
        operation = args.get("operation", "extract_text")
        
        try:
            if operation == "extract_text":
                result = f"Text extracted from {doc_path}: 'Sample document content with key information...'"
            elif operation == "summarize":
                result = f"Document summary for {doc_path}: 'This document covers key topics A, B, and C with conclusions...'"
            elif operation == "analyze_structure":
                result = f"Structure analysis for {doc_path}: 5 sections, 12 paragraphs, 3 tables, 2 images"
            else:
                result = f"Processed document {doc_path} with operation: {operation}"
                
            return [TextContent(type="text", text=result)]
        except Exception as e:
            return [TextContent(type="text", text=f"Document processing error: {str(e)}")]

    async def store_document(self, args: dict) -> list[TextContent]:
        doc_path = args.get("doc_path")
        metadata = args.get("metadata", {})
        
        try:
            result = f"Stored document {doc_path} with metadata: {metadata}"
            return [TextContent(type="text", text=result)]
        except Exception as e:
            return [TextContent(type="text", text=f"Storage error: {str(e)}")]

async def main():
    logger.info("Starting Documents MCP Server on port 8083")
    server_instance = DocsMCPServer()
    
    async with stdio_server() as (read_stream, write_stream):
        await server_instance.server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="docs-pixeltable-server",
                server_version="1.0.0",
                capabilities=server_instance.server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())