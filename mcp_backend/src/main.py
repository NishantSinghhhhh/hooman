from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import tempfile
import shutil
from pathlib import Path
import uvicorn
from dotenv import load_dotenv
from fastapi import Request
import subprocess
import signal
import atexit
import time

# Import your custom agents
from src.agents.image_agent import ImageAgent
from src.agents.document_agent import DocumentAgent
from src.agents.audio_agent import AudioAgent
from src.agents.video_agent import VideoAgent

# Load environment variables
load_dotenv()

# Global list to track MCP server processes
mcp_processes = []

def start_mcp_servers():
    """Start all MCP servers."""
    global mcp_processes
    
    mcp_servers = [
        {
            "name": "Audio MCP Server",
            "command": ["python", "src/server/audio_mcp_server.py"],
        },
        {
            "name": "Video MCP Server", 
            "command": ["python", "src/server/video_mcp_server.py"],
        },
        {
            "name": "Image MCP Server",
            "command": ["python", "src/server/image_mcp_server.py"], 
        },
        {
            "name": "Docs MCP Server",
            "command": ["python", "src/server/docs_mcp_server.py"],
        }
    ]
    
    print("🚀 Starting MCP servers...")
    
    for server in mcp_servers:
        try:
            print(f"   Starting {server['name']}...")
            
            # Check if server file exists
            server_file = server['command'][1]
            if not os.path.exists(server_file):
                print(f"   ⚠️ Skipping {server['name']} - file not found: {server_file}")
                continue
            
            process = subprocess.Popen(
                server["command"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None
            )
            
            mcp_processes.append((server["name"], process))
            print(f"   ✅ {server['name']} started with PID {process.pid}")
            
            # Small delay between server starts
            time.sleep(1)
            
        except Exception as e:
            print(f"   ❌ Failed to start {server['name']}: {e}")
    
    if mcp_processes:
        print(f"✅ Started {len(mcp_processes)} MCP servers successfully")
    else:
        print("⚠️ No MCP servers were started")

def stop_mcp_servers():
    """Stop all MCP servers."""
    global mcp_processes
    
    if not mcp_processes:
        return
    
    print(f"🛑 Stopping {len(mcp_processes)} MCP servers...")
    
    for name, process in mcp_processes:
        try:
            print(f"   Stopping {name}...")
            
            # Try graceful shutdown
            if hasattr(os, 'killpg') and hasattr(os, 'getpgid'):
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            else:
                process.terminate()
            
            # Wait for graceful shutdown
            try:
                process.wait(timeout=3)
                print(f"   ✅ {name} stopped")
            except subprocess.TimeoutExpired:
                # Force kill if needed
                if hasattr(os, 'killpg') and hasattr(os, 'getpgid'):
                    os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                else:
                    process.kill()
                process.wait()
                print(f"   ✅ {name} force stopped")
                
        except Exception as e:
            print(f"   ⚠️ Error stopping {name}: {e}")
    
    mcp_processes.clear()
    print("✅ All MCP servers stopped")

# Register cleanup function
atexit.register(stop_mcp_servers)

# Initialize FastAPI app
app = FastAPI(
    title="Multimodal AI Assistant API",
    description="API for processing multimodal queries using specialized AI agents",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents
try:
    image_agent = ImageAgent()
    document_agent = DocumentAgent()
    audio_agent = AudioAgent()
    video_agent = VideoAgent()
    print("✅ All individual agents initialized successfully")
except Exception as e:
    print(f"⚠️ Error initializing agents: {str(e)}")
    image_agent = None
    document_agent = None
    audio_agent = None
    video_agent = None

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


class QueryRequest(BaseModel):
    """Request model for text-only queries."""
    query: str
    user_id: Optional[str] = None


class QueryResponse(BaseModel):
    """Response model for processed queries."""
    success: bool
    result: Dict[str, Any]
    query: str
    file_processed: bool
    processing_time: Optional[float] = None
    error: Optional[str] = None


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "Multimodal AI Assistant API is running",
        "version": "1.0.0",
        "status": "healthy",
        "agents": {
            "image_agent": "initialized" if image_agent else "failed",
            "document_agent": "initialized" if document_agent else "failed",
            "audio_agent": "initialized" if audio_agent else "failed",
            "video_agent": "initialized" if video_agent else "failed"
        },
        "mcp_servers": {
            "total_running": len(mcp_processes),
            "servers": [name for name, _ in mcp_processes]
        }
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "services": {
            "fastapi": "running",
            "image_agent": "available" if image_agent else "unavailable",
            "document_agent": "available" if document_agent else "unavailable", 
            "audio_agent": "available" if audio_agent else "unavailable",
            "video_agent": "available" if video_agent else "unavailable",
            "openai_api": "configured" if os.getenv("OPENAI_API_KEY") else "not_configured"
        },
        "mcp_servers": {
            "running": len(mcp_processes),
            "details": [
                {
                    "name": name,
                    "pid": process.pid,
                    "status": "running" if process.poll() is None else "stopped"
                }
                for name, process in mcp_processes
            ]
        },
        "upload_dir": str(UPLOAD_DIR.absolute()),
        "supported_formats": {
            "images": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
            "videos": [".mp4", ".mov", ".avi", ".mkv"],
            "audio": [".mp3", ".wav", ".ogg", ".m4a"],
            "documents": [".pdf", ".doc", ".docx", ".txt"],
            "processing_modes": ["full", "quick"]
        }
    }


@app.post("/mcp/restart")
async def restart_mcp_servers():
    """Restart all MCP servers."""
    try:
        stop_mcp_servers()
        time.sleep(2)  # Wait a bit between stop and start
        start_mcp_servers()
        
        return {
            "success": True,
            "message": f"Restarted {len(mcp_processes)} MCP servers",
            "running_servers": [name for name, _ in mcp_processes]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/mcp/status")
async def get_mcp_status():
    """Get detailed status of MCP servers."""
    return {
        "total_servers": len(mcp_processes),
        "servers": [
            {
                "name": name,
                "pid": process.pid,
                "status": "running" if process.poll() is None else "stopped",
                "return_code": process.returncode if process.poll() is not None else None
            }
            for name, process in mcp_processes
        ]
    }

# [Keep all your existing endpoint code - process_image, process_document, etc.]
# I'm not duplicating it here to save space, but include all your existing endpoints

@app.post("/process-image", response_model=QueryResponse)
async def process_image_query(
    query: Optional[str] = Form(None),
    file: UploadFile = File(...),
    mode: Optional[str] = Form("full")
):
    """Process an image with AI analysis."""
    try:
        import time
        start_time = time.time()

        if not image_agent:
            raise HTTPException(
                status_code=503,
                detail="Image processing service is not available. Please check OpenAI API configuration."
            )

        allowed_image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        file_extension = Path(file.filename).suffix.lower()

        if file_extension not in allowed_image_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image file type: {file_extension}. Supported: {', '.join(allowed_image_extensions)}"
            )

        print(f"📁 Processing image: {file.filename}")
        print(f"❓ Query: {query or 'General analysis'}")
        print(f"⚙️ Mode: {mode}")
        
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=file_extension,
            dir=UPLOAD_DIR
        )
        
        try:
            shutil.copyfileobj(file.file, temp_file)
            temp_file.close()

            if mode == "quick":
                result = image_agent.quick_analyze(
                    image_path=temp_file.name,
                    query=query or ""
                )
            else:
                result = image_agent.process_image(
                    image_path=temp_file.name,
                    query=query or ""
                )

            processing_time = time.time() - start_time
            res_data = result.get('result')
            if not isinstance(res_data, dict):
                res_data = {"analysis": str(res_data)}

            return QueryResponse(
                success=result.get('success', False),
                result=res_data,
                query=query or "",
                file_processed=True,
                processing_time=processing_time
            )

        finally:
            try:
                os.unlink(temp_file.name)
                print(f"🗑️ Cleaned up temporary file: {file.filename}")
            except OSError:
                pass

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        processing_time = time.time() - start_time if 'start_time' in locals() else 0
        
        return QueryResponse(
            success=False,
            result={"error": f"Error processing image: {str(e)}"},
            query=query or "",
            file_processed=True,
            processing_time=processing_time,
            error=str(e)
        )

@app.post("/process-video", response_model=QueryResponse)
async def process_video_query(
    file: UploadFile = File(...),
    query: Optional[str] = Form(None),
    user_id: Optional[str] = Form("anonymous"),
    mode: Optional[str] = Form("full")
):
    """Process a video with AI analysis."""
    start_time = time.time()
    try:
        if not video_agent:
            raise HTTPException(
                status_code=503,
                detail="Video processing service is not available."
            )

        allowed_video_extensions = {'.mp4', '.mov', '.avi', '.mkv'}
        file_extension = Path(file.filename).suffix.lower()

        if file_extension not in allowed_video_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported video file type: {file_extension}. Supported: {', '.join(allowed_video_extensions)}"
            )

        print(f"🎬 Processing video: {file.filename}")
        print(f"❓ Query: {query or 'General analysis'}")
        print(f"👤 User ID: {user_id}")
        print(f"⚙️ Mode: {mode}")

        # Save upload to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension, dir=UPLOAD_DIR) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        try:
            if mode == "quick":
                result = video_agent.quick_analyze(
                    video_path=temp_file_path,
                    query=query or "",
                    user_id=user_id
                )
            else: # Default to 'full' mode
                result = video_agent.process_video(
                    video_path=temp_file_path,
                    query=query or "",
                    user_id=user_id
                )

            processing_time = time.time() - start_time
            res_data = result.get('result')
            if not isinstance(res_data, dict):
                res_data = {"analysis": str(res_data)}

            return QueryResponse(
                success=result.get('success', False),
                result=res_data,
                query=query or "",
                file_processed=True,
                processing_time=processing_time,
                error=result.get('error')
            )
        finally:
            # The agent's own cleanup logic will handle the temp file
            # because it saves a permanent copy to the 'data' folder.
            pass

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "result": {"error": f"An unexpected server error occurred: {str(e)}"},
                "query": query or "",
                "file_processed": True,
                "error": str(e)
            }
        )

@app.post("/process-audio", response_model=QueryResponse)
async def process_audio_query(
    file: UploadFile = File(...),
    query: Optional[str] = Form(None),
    user_id: Optional[str] = Form("anonymous"),
    mode: Optional[str] = Form("full")
):
    """Process an audio file with AI analysis."""
    start_time = time.time()
    try:
        if not audio_agent:
            raise HTTPException(
                status_code=503,
                detail="Audio processing service is not available."
            )

        allowed_audio_extensions = {'.mp3', '.wav', '.m4a', '.ogg', '.flac'}
        file_extension = Path(file.filename).suffix.lower()

        if file_extension not in allowed_audio_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported audio file type: {file_extension}. Supported: {', '.join(allowed_audio_extensions)}"
            )

        print(f"🎵 Processing audio: {file.filename}")
        print(f"❓ Query: {query or 'General analysis'}")
        print(f"👤 User ID: {user_id}")
        print(f"⚙️ Mode: {mode}")

        # Save upload to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension, dir=UPLOAD_DIR) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        try:
            if mode == "quick":
                result = audio_agent.quick_analyze(
                    audio_path=temp_file_path,
                    query=query or "",
                    user_id=user_id
                )
            else: # Default to 'full' mode
                result = audio_agent.process_audio(
                    audio_path=temp_file_path,
                    query=query or "",
                    user_id=user_id
                )

            processing_time = time.time() - start_time
            res_data = result.get('result')
            if not isinstance(res_data, dict):
                res_data = {"analysis": str(res_data)}

            return QueryResponse(
                success=result.get('success', False),
                result=res_data,
                query=query or "",
                file_processed=True,
                processing_time=processing_time,
                error=result.get('error')
            )
        finally:
            # The agent's own cleanup logic will handle the temp file
            # as it saves a permanent copy to the 'data' folder.
            pass

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "result": {"error": f"An unexpected server error occurred: {str(e)}"},
                "query": query or "",
                "file_processed": True,
                "error": str(e)
            }
        )

@app.post("/process-document", response_model=QueryResponse)
async def process_document_query(
    file: UploadFile = File(...),
    query: Optional[str] = Form(None),
    user_id: Optional[str] = Form("anonymous"),
    mode: Optional[str] = Form("full") 
):
    """Process a document with AI analysis."""
    start_time = time.time()
    try:
        if not document_agent:
            raise HTTPException(
                status_code=503,
                detail="Document processing service is not available."
            )

        allowed_doc_extensions = {'.pdf', '.docx', '.txt', '.doc'}
        file_extension = Path(file.filename).suffix.lower()

        if file_extension not in allowed_doc_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported document file type: {file_extension}. Supported: {', '.join(allowed_doc_extensions)}"
            )

        print(f"📁 Processing document: {file.filename}")
        print(f"❓ Query: {query or 'General analysis'}")
        print(f"👤 User ID: {user_id}")
        print(f"⚙️ Mode: {mode}")

        # Save upload to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension, dir=UPLOAD_DIR) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        try:
            # CORRECTED LOGIC: Handle both 'full' and 'quick' modes
            if mode == "full":
                result = document_agent.process_document(
                    document_path=temp_file_path,
                    query=query or "",
                    user_id=user_id
                )
            else:  # This handles 'quick' or any other value
                result = document_agent.quick_analyze(
                    document_path=temp_file_path,
                    query=query or "",
                    user_id=user_id
                )

            processing_time = time.time() - start_time
            res_data = result.get('result')
            if not isinstance(res_data, dict):
                res_data = {"analysis": str(res_data)}

            return QueryResponse(
                success=result.get('success', False),
                result=res_data,
                query=query or "",
                file_processed=True,
                processing_time=processing_time,
                error=result.get('error')
            )
        finally:
            # The agent's own cleanup will handle the temp file
            # as it's now copied to the 'data' folder.
            pass
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "result": {"error": f"An unexpected server error occurred: {str(e)}"},
                "query": query or "",
                "file_processed": True,
                "error": str(e)
            }
        )

    
@app.get("/capabilities")
async def get_capabilities():
    """Get information about API capabilities."""
    return {
        "image_processing": {
            "available": image_agent is not None,
            "modes": ["full", "quick"],
            "supported_formats": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
            "features": [
                "Object detection",
                "Scene analysis", 
                "Text extraction",
                "Artistic analysis",
                "Custom query responses"
            ]
        },
        "document_processing": {
            "available": document_agent is not None,
            "modes": ["full", "quick"],
            "supported_formats": [".pdf", ".doc", ".docx", ".txt"],
            "features": [
                "Text extraction",
                "Document summarization",
                "Question answering",
                "Structure analysis"
            ]
        },
        "audio_processing": {
            "available": audio_agent is not None,
            "modes": ["full", "quick"],
            "supported_formats": [".mp3", ".wav", ".ogg", ".m4a"],
            "features": [
                "Audio transcription",
                "Speech analysis",
                "Content extraction"
            ]
        },
        "video_processing": {
            "available": video_agent is not None,
            "modes": ["full", "quick"],
            "supported_formats": [".mp4", ".mov", ".avi", ".mkv"],
            "features": [
                "Scene analysis",
                "Object detection",
                "Content summarization"
            ]
        },
        "text_processing": {
            "available": True,
            "features": [
                "General text analysis",
                "Query processing",
                "Response generation"
            ]
        },
        "mcp_integration": {
            "available": len(mcp_processes) > 0,
            "servers_running": len(mcp_processes),
            "features": [
                "Automatic MCP server management",
                "Server restart capability",
                "Process monitoring"
            ]
        },
        "api_info": {
            "version": "1.0.0",
            "max_file_size": "10MB",
            "rate_limits": "Based on OpenAI API limits"
        }
    }


if __name__ == "__main__":
    # Start MCP servers first
    start_mcp_servers()
    
    # Run the FastAPI server
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8001))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    print(f"🚀 Starting Multimodal AI Assistant API")
    print(f"📍 Server: {host}:{port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"📁 Upload directory: {UPLOAD_DIR.absolute()}")
    print(f"🌐 API docs will be available at: http://{host}:{port}/docs")
    print(f"💡 Health check: http://{host}:{port}/health")
    print(f"🎯 Capabilities: http://{host}:{port}/capabilities")
    print(f"🔧 MCP Status: http://{host}:{port}/mcp/status")
    
    try:
        uvicorn.run(
            "src.main:app",
            host=host,
            port=port,
            reload=debug,
            log_level="info" if debug else "warning",
            access_log=debug
        )
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    finally:
        stop_mcp_servers()