
from crewai.tools import tool
from typing import Dict, Any
import httpx
import os


@tool("MCP Query Tool")
def mcp_query_tool(query: str, media_type: str, file_path: str = None) -> Dict[str, Any]:
    """
    Tool to interact with MCP servers for multimodal processing.
    
    Args:
        query: The query to send to the MCP server
        media_type: Type of media: audio, video, image, or docs
        file_path: Path to uploaded file if applicable
    
    Returns:
        Dictionary containing the processing results
    """
    
    # Map media types to MCP server URLs
    mcp_urls = {
        "audio": os.getenv("AUDIO_MCP_URL"),
        "video": os.getenv("VIDEO_MCP_URL"),
        "image": os.getenv("IMAGE_MCP_URL"),
        "docs": os.getenv("DOCS_MCP_URL")
    }
    
    url = mcp_urls.get(media_type.lower())
    if not url:
        return {"error": f"Unsupported media type: {media_type}"}
    
    try:
        # Prepare payload
        payload = {
            "query": query,
            "file_path": file_path
        }
        
        # Send request to MCP server
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            return {
                "success": True,
                "media_type": media_type,
                "result": result,
                "query": query
            }
            
    except httpx.RequestError as e:
        return {
            "success": False,
            "error": f"Request failed: {str(e)}",
            "media_type": media_type
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "media_type": media_type
        }


# Alternative class-based approach if needed
class MCPTool:
    """Legacy wrapper for compatibility"""
    
    def __init__(self):
        self.name = "MCP Query Tool"
        self.description = "Tool to interact with MCP servers for multimodal processing"
    
    def run(self, query: str, media_type: str, file_path: str = None) -> Dict[str, Any]:
        """Execute the MCP query based on media type."""
        return mcp_query_tool(query, media_type, file_path)
