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
import subprocess
import signal
import atexit
import time
from datetime import datetime
import pixeltable as pxt
import asyncio
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import json # Import json for pretty printing

# Import your custom agents
from src.agents.image_agent import ImageAgent
from src.agents.document_agent import DocumentAgent
from src.agents.audio_agent import AudioAgent
from src.agents.video_agent import VideoAgent

from src.queries.queries import (
        get_all_user_data
    )
# Load environment variables
load_dotenv()

app = APIRouter()
QUERIES_AVAILABLE = True

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

# Pixeltable queries availability
QUERIES_AVAILABLE = True

# ----------- Helper async functions to run Pixeltable blocking calls in thread executor -----------

async def fetch_images(user_id: str):
    def query():
        image_table = pxt.get_table('demo.images')
        images_result = image_table.where(image_table.user_id == user_id)
        if hasattr(images_result, 'to_pandas'):
            return images_result.to_pandas().to_dict('records')
        return []
    return await asyncio.get_running_loop().run_in_executor(None, query)

async def fetch_documents(user_id: str):
    def query():
        document_table = pxt.get_table('demo.documents')
        documents_result = document_table.where(document_table.user_id == user_id)
        if hasattr(documents_result, 'to_pandas'):
            return documents_result.to_pandas().to_dict('records')
        return []
    return await asyncio.get_running_loop().run_in_executor(None, query)

async def fetch_videos(user_id: str):
    def query():
        video_table = pxt.get_table('demo.videos')
        videos_result = video_table.where(video_table.user_id == user_id)
        if hasattr(videos_result, 'to_pandas'):
            return videos_result.to_pandas().to_dict('records')
        return []
    return await asyncio.get_running_loop().run_in_executor(None, query)

async def fetch_audio(user_id: str):
    def query():
        audio_table = pxt.get_table('demo.audio')
        audio_result = audio_table.where(audio_table.user_id == user_id)
        if hasattr(audio_result, 'to_pandas'):
            return audio_result.to_pandas().to_dict('records')
        return []
    return await asyncio.get_running_loop().run_in_executor(None, query)

async def fetch_tracking(user_id: str):
    def query():
        track_table = pxt.get_table('demo.agent_tracking')
        track_result = track_table.where(track_table.user_id == user_id)
        if hasattr(track_result, 'to_pandas'):
            return track_result.to_pandas().to_dict('records')
        return []
    return await asyncio.get_running_loop().run_in_executor(None, query)

# -----------------------------------------------------------------------------------------------

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

@app.get("/api/user-data/{user_id}")
async def get_user_data(user_id: str):
    """Get all data for a specific user from Pixeltable"""

    print(f"📥 Request received: GET /api/user-data/{user_id}")

    if not QUERIES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Query functions not available")

    try:
        print(f"📊 Starting to fetch all data for user: {user_id}")

        # Run the entire sequential process in a single background thread
        data = await asyncio.to_thread(get_all_user_data, user_id)

        print(f"✅ Total records fetched for user {user_id}: {data['total_records']}")

        # --- ADDED LOGGING ---
        # Log the structure of the data being returned.
        # Using json.dumps for pretty-printing the dictionary.
        print("📦 Returning combined data structure:")
        # Use default=str to handle non-serializable types like datetime
        print(json.dumps(data, indent=2, default=str))
        # ---------------------

        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            **data
        }

    except Exception as e:
        print(f"❌ Unexpected error fetching user data for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user data: {str(e)}")
@app.post("/process-image", response_model=QueryResponse)
async def process_image_query(
    file: UploadFile = File(...),
    query: Optional[str] = Form(""),
    user_id: Optional[str] = Form("anonymous"),
    mode: Optional[str] = Form("full")
):
    """Process an image with AI analysis."""
    start_time = time.time()
    temp_file_path = None
    
    try:
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
        print(f"👤 User ID: {user_id}")
        print(f"⚙️ Mode: {mode}")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension, dir=UPLOAD_DIR) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        if mode == "quick":
            result = image_agent.quick_analyze(
                image_path=temp_file_path,
                query=query or "",
                user_id=user_id
            )
        else:
            result = image_agent.process_image(
                image_path=temp_file_path,
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

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        processing_time = time.time() - start_time
        
        return QueryResponse(
            success=False,
            result={"error": f"Error processing image: {str(e)}"},
            query=query or "",
            file_processed=True,
            processing_time=processing_time,
            error=str(e)
        )
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                print(f"🗑️ Cleaned up temporary file: {file.filename}")
            except OSError:
                pass

@app.post("/process-document", response_model=QueryResponse)
async def process_document_query(
    file: UploadFile = File(...),
    query: Optional[str] = Form(""),
    user_id: Optional[str] = Form("anonymous"),
    mode: Optional[str] = Form("full") 
):
    """Process a document with AI analysis."""
    start_time = time.time()
    temp_file_path = None
    
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

        if mode == "full":
            result = document_agent.process_document(
                document_path=temp_file_path,
                query=query or "",
                user_id=user_id
            )
        else:  # quick mode
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

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        processing_time = time.time() - start_time
        
        return QueryResponse(
            success=False,
            result={"error": f"Error processing document: {str(e)}"},
            query=query or "",
            file_processed=True,
            processing_time=processing_time,
            error=str(e)
        )
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                print(f"🗑️ Cleaned up temporary file: {file.filename}")
            except OSError:
                pass

@app.post("/process-audio", response_model=QueryResponse)
async def process_audio_query(
    file: UploadFile = File(...),
    query: Optional[str] = Form(""),
    user_id: Optional[str] = Form("anonymous"),
    mode: Optional[str] = Form("full")
):
    """Process an audio file with AI analysis."""
    start_time = time.time()
    temp_file_path = None
    
    try:
        if not audio_agent:
            raise HTTPException(
                status_code=503,
                detail="Audio processing service is not available."
            )

        allowed_audio_extensions = {'.mp3', '.wav', '.ogg', '.m4a', '.flac'}
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

        if mode == "full":
            result = audio_agent.process_audio(
                audio_path=temp_file_path,
                query=query or "",
                user_id=user_id
            )
        else:  # quick mode
            result = audio_agent.quick_analyze(
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

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        processing_time = time.time() - start_time
        
        return QueryResponse(
            success=False,
            result={"error": f"Error processing audio: {str(e)}"},
            query=query or "",
            file_processed=True,
            processing_time=processing_time,
            error=str(e)
        )
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                print(f"🗑️ Cleaned up temporary file: {file.filename}")
            except OSError:
                pass

@app.post("/process-video", response_model=QueryResponse)
async def process_video_query(
    file: UploadFile = File(...),
    query: Optional[str] = Form(""),
    user_id: Optional[str] = Form("anonymous"),
    mode: Optional[str] = Form("full")
):
    """Process a video file with AI analysis."""
    start_time = time.time()
    temp_file_path = None
    
    try:
        if not video_agent:
            raise HTTPException(
                status_code=503,
                detail="Video processing service is not available."
            )

        allowed_video_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
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

        if mode == "full":
            result = video_agent.process_video(
                video_path=temp_file_path,
                query=query or "",
                user_id=user_id
            )
        else:  # quick mode
            result = video_agent.quick_analyze(
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

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        processing_time = time.time() - start_time
        
        return QueryResponse(
            success=False,
            result={"error": f"Error processing video: {str(e)}"},
            query=query or "",
            file_processed=True,
            processing_time=processing_time,
            error=str(e)
        )
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                print(f"🗑️ Cleaned up temporary file: {file.filename}")
            except OSError:
                pass

# TEXT-ONLY QUERY ENDPOINT
@app.post("/query", response_model=QueryResponse)
async def process_text_query(request: QueryRequest):
    """Process a text-only query."""
    start_time = time.time()
    
    try:
        print(f"💬 Processing text query: {request.query}")
        print(f"👤 User ID: {request.user_id or 'anonymous'}")
        
        # For text-only queries, you might want to use a general agent or route to the most appropriate one
        # This is a simple implementation - you can enhance this based on your needs
        
        result = {
            "message": "Text query received",
            "query": request.query,
            "user_id": request.user_id or "anonymous",
            "note": "This endpoint can be enhanced to route text queries to appropriate agents"
        }
        
        processing_time = time.time() - start_time
        
        return QueryResponse(
            success=True,
            result=result,
            query=request.query,
            file_processed=False,
            processing_time=processing_time
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        processing_time = time.time() - start_time
        
        return QueryResponse(
            success=False,
            result={"error": f"Error processing text query: {str(e)}"},
            query=request.query,
            file_processed=False,
            processing_time=processing_time,
            error=str(e)
        )

if __name__ == "__main__":
    # Start MCP servers first
    start_mcp_servers()
    
    # Run the FastAPI server with asyncio loop
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8001))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    print(f"🚀 Starting Multimodal AI Assistant API")
    print(f"📍 Server: {host}:{port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"📁 Upload directory: {UPLOAD_DIR.absolute()}")
    print(f"🌐 API docs will be available at: http://{host}:{port}/docs")
    print(f"💡 Health check: http://{host}:{port}/health")
    
    try:
        uvicorn.run(
            app,
            host=host,
            port=port,
            reload=debug,
            log_level="info" if debug else "warning",
            access_log=debug,
            loop="asyncio"  # forcing asyncio loop (recommended)
        )
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    finally:
        stop_mcp_servers()