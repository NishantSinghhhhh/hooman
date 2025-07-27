import asyncio
import logging
import json 
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

# Import with error handling
try:
    from src.ingestor.image_ingestor import ImageIngestor
    PIXELTABLE_AVAILABLE = True
except Exception as e:
    logging.warning(f"Pixeltable ingestor not available: {e}")
    PIXELTABLE_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-mcp-server")


class ImageMCPServer:
    def __init__(self):
        self.server = Server("image-pixeltable-server")
        self.ingestor = None
        
        # Initialize ingestor with error handling
        if PIXELTABLE_AVAILABLE:
            try:
                self.ingestor = ImageIngestor()
                logger.info("✅ Pixeltable ingestor initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Pixeltable ingestor: {e}")
                logger.info("🔄 Server will run in fallback mode without Pixeltable")
                self.ingestor = None
        
        self.setup_handlers()

    async def handle_process_image(self, args: dict) -> list[TextContent]:
        """Handle image processing operations"""
        image_path = args.get("image_path")
        operation = args.get("operation", "detect_objects")
        
        logger.info(f"🖼️ Processing image: {image_path} with operation: {operation}")
        
        try:
            # Mock processing results (replace with actual image processing logic)
            if operation == "detect_objects":
                result = {
                    "operation": operation,
                    "image_path": image_path,
                    "objects": [
                        {"name": "person", "confidence": 0.95, "bbox": [100, 50, 200, 300]},
                        {"name": "car", "confidence": 0.87, "bbox": [300, 100, 500, 250]},
                        {"name": "building", "confidence": 0.92, "bbox": [0, 0, 600, 200]}
                    ],
                    "count": 3
                }
            elif operation == "extract_text":
                result = {
                    "operation": operation,
                    "image_path": image_path,
                    "text": "Sample text content extracted from image",
                    "confidence": 0.89
                }
            elif operation == "analyze_colors":
                result = {
                    "operation": operation,
                    "image_path": image_path,
                    "dominant_colors": [
                        {"color": "blue", "percentage": 35, "hex": "#4A90E2"},
                        {"color": "white", "percentage": 25, "hex": "#FFFFFF"},
                        {"color": "green", "percentage": 20, "hex": "#7ED321"}
                    ]
                }
            else:
                result = {
                    "operation": operation,
                    "image_path": image_path,
                    "message": f"Processed with operation: {operation}"
                }
            
            logger.info(f"✅ Processing successful: {operation}")
            return [TextContent(type="text", text=json.dumps(result, indent=2))]
            
        except Exception as e:
            logger.error(f"❌ Image processing error: {e}")
            return [TextContent(type="text", text=f"Image processing error: {str(e)}")]

    async def handle_store_image(self, args: dict) -> list[TextContent]:
        """Handle image storage operations"""
        image_path = args.get("image_path")
        query = args.get("query", "")
        crewai_result = args.get("crewai_result", {})
        metadata = args.get("metadata", {})

        logger.info(f"💾 [store_image] Params - path: {image_path}, query: '{query}', crewai: {bool(crewai_result)}, metadata keys: {list(metadata.keys())}")

        try:
            if self.ingestor:
                # Use Pixeltable ingestor
                result = self.ingestor.ingest_image(
                    image_path=image_path,
                    query=query,
                    crewai_result=crewai_result,
                    metadata=metadata
                )
                logger.info(f"✅ [Pixeltable] Ingest successful")
                return [TextContent(type="text", text=json.dumps(result, indent=2))]
            else:
                # Fallback mode - return mock response
                fallback_result = {
                    "status": "stored_fallback",
                    "image_path": image_path,
                    "query": query,
                    "metadata": metadata,
                    "crewai_result": crewai_result,
                    "timestamp": asyncio.get_event_loop().time(),
                    "note": "Stored in fallback mode - Pixeltable not available"
                }
                logger.info(f"⚠️ [Fallback] Storage completed without Pixeltable")
                return [TextContent(type="text", text=json.dumps(fallback_result, indent=2))]
                
        except Exception as e:
            logger.error(f"❌ Storage error: {e}")
            return [TextContent(type="text", text=f"Storage error: {str(e)}")]

async def main():
    logger.info("🚀 Starting Image MCP Server (Pixeltable-backed, stdio mode)")
    
    try:
        server_instance = ImageMCPServer()
        logger.info("✅ Server instance created successfully")
        
        async with stdio_server() as (read_stream, write_stream):
            logger.info("📡 Starting MCP server communication...")
            await server_instance.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="image-pixeltable-server",
                    server_version="1.0.0",
                    capabilities=server_instance.server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())