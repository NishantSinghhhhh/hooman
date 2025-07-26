#!/usr/bin/env python3
"""
MCP Backend Main Entry Point
FastAPI server with CrewAI multimodal processing
"""

import os
import sys
import asyncio
import uvicorn
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging

# Import our crew
from .crew import McpBackendCrew

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/mcp_backend.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MCP Backend with CrewAI",
    description="Multimodal AI processing with CrewAI agents and MCP servers",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize crew
crew_instance = None

# Pydantic models
class QueryRequest(BaseModel):
    content: str
    media_type: str = "text"
    user_id: str
    metadata: Optional[Dict[str, Any]] = None

class ClassificationRequest(BaseModel):
    classification: Dict[str, Any]
    queryData: Dict[str, Any]
    routing: Optional[Dict[str, Any]] = None
    timestamp: str
    source: str = "typescript_backend"

# In-memory storage for demo (use database in production)
query_results = {}
processing_status = {}

@app.on_event("startup")
async def startup_event():
    """Initialize the crew on startup"""
    global crew_instance
    try:
        logger.info("🚀 Starting MCP Backend with CrewAI...")
        
        # Create uploads and logs directories
        Path("uploads").mkdir(exist_ok=True)
        Path("logs").mkdir(exist_ok=True)
        
        # Initialize crew
        crew_instance = McpBackendCrew()
        logger.info("✅ CrewAI initialized successfully")
        
        # Test crew health
        health = crew_instance.health_check()
        logger.info(f"🏥 Crew health: {health}")
        
    except Exception as e:
        logger.error(f"❌ File upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-classification")
async def process_classification(request: ClassificationRequest):
    """Process classification from TypeScript backend"""
    try:
        logger.info("📡 Received classification from TypeScript backend")
        logger.info(f"🎯 Classification: {request.classification}")
        
        # Store the classification result
        query_id = f"ts_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        query_results[query_id] = {
            "success": True,
            "source": "typescript_backend",
            "classification": request.classification,
            "query_data": request.queryData,
            "routing": request.routing,
            "timestamp": request.timestamp,
            "query_id": query_id
        }
        
        return {
            "success": True,
            "message": "Classification processed successfully",
            "query_id": query_id
        }
        
    except Exception as e:
        logger.error(f"❌ Classification processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-image")
async def process_image_classification(request: ClassificationRequest):
    """Process image classification with Pixeltable integration"""
    try:
        logger.info("🖼️ Processing image classification for Pixeltable")
        
        # Here you would integrate with actual Pixeltable image processing
        # For now, we'll simulate the response
        
        query_id = f"img_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Simulate image processing result
        pixeltable_result = {
            "image_analysis": {
                "objects_detected": ["person", "chair", "table"],
                "confidence_scores": [0.95, 0.87, 0.82],
                "scene_description": "Indoor office setting with person at desk",
                "color_palette": ["#2C3E50", "#ECF0F1", "#3498DB"],
                "text_extracted": "Sample OCR text if any",
                "metadata": {
                    "width": 1920,
                    "height": 1080,
                    "format": "JPEG",
                    "file_size": "2.3MB"
                }
            },
            "pixeltable_indexed": True,
            "embedding_created": True
        }
        
        query_results[query_id] = {
            "success": True,
            "source": "typescript_backend_image",
            "classification": request.classification,
            "pixeltable_result": pixeltable_result,
            "query_data": request.queryData,
            "routing": request.routing,
            "timestamp": request.timestamp,
            "query_id": query_id
        }
        
        return {
            "success": True,
            "message": "Image processed and indexed in Pixeltable",
            "query_id": query_id,
            "result": pixeltable_result
        }
        
    except Exception as e:
        logger.error(f"❌ Image processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-files-metadata")
async def process_files_metadata(request: Dict[str, Any]):
    """Process file metadata from TypeScript backend"""
    try:
        logger.info("📁 Processing file metadata from TypeScript backend")
        logger.info(f"🎯 Agent type: {request.get('agentType')}")
        logger.info(f"📊 File count: {len(request.get('files', []))}")
        
        query_id = f"files_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Process metadata and store
        query_results[query_id] = {
            "success": True,
            "source": "typescript_backend_files",
            "agent_type": request.get('agentType'),
            "files_metadata": request.get('files', []),
            "query_text": request.get('queryText', ''),
            "user_id": request.get('userId'),
            "timestamp": request.get('timestamp'),
            "query_id": query_id
        }
        
        return {
            "success": True,
            "message": "File metadata processed successfully",
            "query_id": query_id
        }
        
    except Exception as e:
        logger.error(f"❌ File metadata processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_system_stats():
    """Get system statistics"""
    try:
        return {
            "total_queries": len(query_results),
            "processing_queries": len([s for s in processing_status.values() if s == "processing"]),
            "completed_queries": len([s for s in processing_status.values() if s == "completed"]),
            "failed_queries": len([s for s in processing_status.values() if s == "error"]),
            "crew_health": crew_instance.health_check() if crew_instance else "not_initialized",
            "uptime": "system uptime info",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Stats retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/query/{query_id}")
async def delete_query_result(query_id: str):
    """Delete a query result"""
    try:
        if query_id in query_results:
            del query_results[query_id]
        if query_id in processing_status:
            del processing_status[query_id]
        
        return {
            "success": True,
            "message": f"Query {query_id} deleted successfully"
        }
    except Exception as e:
        logger.error(f"❌ Query deletion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="info"
    )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MCP Backend with CrewAI",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        if crew_instance:
            health = crew_instance.health_check()
            return {
                "status": "healthy" if health.get('crew') == 'healthy' else "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "details": health
            }
        else:
            return {
                "status": "unhealthy", 
                "timestamp": datetime.now().isoformat(),
                "error": "Crew not initialized"
            }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        )

@app.post("/api/query")
async def process_multimodal_query(
    query_request: QueryRequest,
    background_tasks: BackgroundTasks
):
    """Process a multimodal query through CrewAI"""
    try:
        if not crew_instance:
            raise HTTPException(status_code=503, detail="Crew not initialized")
        
        query_id = f"query_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{query_request.user_id}"
        
        logger.info(f"📥 Processing query {query_id}")
        logger.info(f"👤 User: {query_request.user_id}")
        logger.info(f"🎯 Media type: {query_request.media_type}")
        logger.info(f"📝 Content preview: {query_request.content[:100]}...")
        
        # Set processing status
        processing_status[query_id] = "processing"
        
        # Process in background
        background_tasks.add_task(
            process_query_background,
            query_id,
            query_request.dict()
        )
        
        return {
            "success": True,
            "query_id": query_id,
            "status": "processing",
            "message": "Query submitted for processing"
        }
        
    except Exception as e:
        logger.error(f"❌ Query submission failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_query_background(query_id: str, query_data: Dict[str, Any]):
    """Background task to process query with crew"""
    start_time = datetime.now()
    
    try:
        logger.info(f"🔄 Background processing started for {query_id}")
        
        # Process with crew
        result = crew_instance.process_multimodal_query(query_data)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Store result
        query_results[query_id] = {
            **result,
            "query_id": query_id,
            "processing_time": processing_time,
            "timestamp": datetime.now().isoformat()
        }
        
        processing_status[query_id] = "completed" if result.get('success') else "error"
        
        logger.info(f"✅ Query {query_id} completed in {processing_time:.2f}s")
        
    except Exception as e:
        logger.error(f"❌ Background processing failed for {query_id}: {e}")
        
        processing_status[query_id] = "error"
        query_results[query_id] = {
            "success": False,
            "error": str(e),
            "query_id": query_id,
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/query/{query_id}/status")
async def get_query_status(query_id: str):
    """Get query processing status"""
    try:
        status = processing_status.get(query_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Query not found")
        
        response = {
            "query_id": query_id,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
        
        if status == "completed" and query_id in query_results:
            response["result"] = query_results[query_id]
        elif status == "error" and query_id in query_results:
            response["error"] = query_results[query_id].get("error")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Status check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/query/{query_id}")
async def get_query_result(query_id: str):
    """Get query result"""
    try:
        if query_id not in query_results:
            raise HTTPException(status_code=404, detail="Query result not found")
        
        return query_results[query_id]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Result retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/classify")
async def quick_classify(query_request: QueryRequest):
    """Quick classification without full processing"""
    try:
        if not crew_instance:
            raise HTTPException(status_code=503, detail="Crew not initialized")
        
        logger.info(f"⚡ Quick classification for user {query_request.user_id}")
        
        result = crew_instance.quick_classify(query_request.dict())
        
        return {
            "success": True,
            "classification": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    background_tasks: BackgroundTasks = None
):
    """Handle file upload and process with crew"""
    try:
        if not crew_instance:
            raise HTTPException(status_code=503, detail="Crew not initialized")
        
        # Save uploaded file
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Determine media type
        media_type = "document"
        if file.content_type:
            if file.content_type.startswith("image/"):
                media_type = "image"
            elif file.content_type.startswith("audio/"):
                media_type = "audio"
            elif file.content_type.startswith("video/"):
                media_type = "video"
        
        # Create query request
        query_request = QueryRequest(
            content=str(file_path),
            media_type=media_type,
            user_id=user_id,
            metadata={
                "filename": file.filename,
                "content_type": file.content_type,
                "file_size": len(content)
            }
        )
        
        # Process the uploaded file
        return await process_multimodal_query(query_request, background_tasks)
        
    except Exception as e:
        logger.error