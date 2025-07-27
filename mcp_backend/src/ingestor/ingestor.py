"""
Fixed Pixeltable Agent Insert Functions
=====================================
Fixed functions for inserting data into agent tables with proper error handling.
"""

import pixeltable as pxt
from datetime import datetime
from typing import Dict, List, Any, Optional
import json

# =============================================================================
# 🖼️ IMAGE AGENT INSERT FUNCTIONS
# =============================================================================

def insert_image_record(
    user_id: str,
    image_path: str,
    query: str,
    crewai_result: Dict[str, Any],
    tokens_used: int,
    context: str = "Image analysis",
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Insert a single image analysis record
    
    Args:
        user_id: User identifier
        image_path: Path to the image file
        query: User's query about the image
        crewai_result: AI agent's analysis result
        tokens_used: Number of tokens consumed
        context: Context description
        metadata: Additional metadata (optional)
    
    Returns:
        bool: Success status
    """
    try:
        table = pxt.get_table('demo.images')
        
        # Convert complex objects to JSON strings to avoid serialization issues
        metadata_json = json.dumps(metadata or {})
        crewai_result_json = json.dumps(crewai_result)
        
        # Create record as a simple dictionary with basic types only
        record = {
            'user_id': str(user_id),
            'image': str(image_path),
            'file_path': str(image_path),
            'query': str(query),
            'metadata': metadata_json,  # JSON string
            'crewai_result': crewai_result_json,  # JSON string
            'tokens_used': int(tokens_used),
            'context': str(context),
            'timestamp': datetime.now()
        }
        
        # Insert as a list (required by Pixeltable)
        table.insert([record])
        return True
        
    except Exception as e:
        print(f"Error inserting image record: {e}")
        return False

def batch_insert_images(records: List[Dict[str, Any]]) -> bool:
    """
    Insert multiple image records at once
    
    Args:
        records: List of image record dictionaries
    
    Returns:
        bool: Success status
    """
    try:
        table = pxt.get_table('demo.images')
        
        # Process each record to ensure proper format
        processed_records = []
        for record in records:
            # Add timestamp if not present
            if 'timestamp' not in record:
                record['timestamp'] = datetime.now()
            
            # Convert complex objects to JSON strings
            if 'metadata' in record and isinstance(record['metadata'], dict):
                record['metadata'] = json.dumps(record['metadata'])
            if 'crewai_result' in record and isinstance(record['crewai_result'], dict):
                record['crewai_result'] = json.dumps(record['crewai_result'])
            
            # Ensure all values are proper types
            processed_record = {
                'user_id': str(record.get('user_id', '')),
                'image': str(record.get('image', '')),
                'file_path': str(record.get('file_path', '')),
                'query': str(record.get('query', '')),
                'metadata': record.get('metadata', '{}'),
                'crewai_result': record.get('crewai_result', '{}'),
                'tokens_used': int(record.get('tokens_used', 0)),
                'context': str(record.get('context', 'Image analysis')),
                'timestamp': record['timestamp']
            }
            processed_records.append(processed_record)
        
        table.insert(processed_records)
        return True
        
    except Exception as e:
        print(f"Error batch inserting image records: {e}")
        return False

# =============================================================================
# 📄 DOCUMENT AGENT INSERT FUNCTIONS
# =============================================================================

def insert_document_record(
    user_id: str,
    document_path: str,
    document_type: str,
    page_count: int,
    query: str,
    crewai_result: Dict[str, Any],
    tokens_used: int,
    context: str = "Document analysis",
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Insert a single document analysis record
    """
    try:
        table = pxt.get_table('demo.documents')
        
        # Convert complex objects to JSON strings
        metadata_json = json.dumps(metadata or {})
        crewai_result_json = json.dumps(crewai_result)
        
        record = {
            'user_id': str(user_id),
            'document': str(document_path),
            'file_path': str(document_path),
            'document_type': str(document_type),
            'page_count': int(page_count),
            'query': str(query),
            'metadata': metadata_json,
            'crewai_result': crewai_result_json,
            'tokens_used': int(tokens_used),
            'context': str(context),
            'timestamp': datetime.now()
        }
        
        table.insert([record])
        return True
        
    except Exception as e:
        print(f"Error inserting document record: {e}")
        return False

def batch_insert_documents(records: List[Dict[str, Any]]) -> bool:
    """
    Insert multiple document records at once
    """
    try:
        table = pxt.get_table('demo.documents')
        
        processed_records = []
        for record in records:
            if 'timestamp' not in record:
                record['timestamp'] = datetime.now()
            
            # Convert complex objects to JSON strings
            if 'metadata' in record and isinstance(record['metadata'], dict):
                record['metadata'] = json.dumps(record['metadata'])
            if 'crewai_result' in record and isinstance(record['crewai_result'], dict):
                record['crewai_result'] = json.dumps(record['crewai_result'])
            
            processed_record = {
                'user_id': str(record.get('user_id', '')),
                'document': str(record.get('document', '')),
                'file_path': str(record.get('file_path', '')),
                'document_type': str(record.get('document_type', '')),
                'page_count': int(record.get('page_count', 0)),
                'query': str(record.get('query', '')),
                'metadata': record.get('metadata', '{}'),
                'crewai_result': record.get('crewai_result', '{}'),
                'tokens_used': int(record.get('tokens_used', 0)),
                'context': str(record.get('context', 'Document analysis')),
                'timestamp': record['timestamp']
            }
            processed_records.append(processed_record)
        
        table.insert(processed_records)
        return True
        
    except Exception as e:
        print(f"Error batch inserting document records: {e}")
        return False

# =============================================================================
# 🎞️ VIDEO AGENT INSERT FUNCTIONS
# =============================================================================

def insert_video_record(
    user_id: str,
    video_path: str,
    duration: float,
    fps: float,
    resolution: str,
    query: str,
    crewai_result: Dict[str, Any],
    tokens_used: int,
    context: str = "Video analysis",
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Insert a single video analysis record
    """
    try:
        table = pxt.get_table('demo.videos')
        
        # Convert complex objects to JSON strings
        metadata_json = json.dumps(metadata or {})
        crewai_result_json = json.dumps(crewai_result)
        
        record = {
            'user_id': str(user_id),
            'video': str(video_path),
            'file_path': str(video_path),
            'duration': float(duration),
            'fps': float(fps),
            'resolution': str(resolution),
            'query': str(query),
            'metadata': metadata_json,
            'crewai_result': crewai_result_json,
            'tokens_used': int(tokens_used),
            'context': str(context),
            'timestamp': datetime.now()
        }
        
        table.insert([record])
        return True
        
    except Exception as e:
        print(f"Error inserting video record: {e}")
        return False

def batch_insert_videos(records: List[Dict[str, Any]]) -> bool:
    """
    Insert multiple video records at once
    """
    try:
        table = pxt.get_table('demo.videos')
        
        processed_records = []
        for record in records:
            if 'timestamp' not in record:
                record['timestamp'] = datetime.now()
            
            # Convert complex objects to JSON strings
            if 'metadata' in record and isinstance(record['metadata'], dict):
                record['metadata'] = json.dumps(record['metadata'])
            if 'crewai_result' in record and isinstance(record['crewai_result'], dict):
                record['crewai_result'] = json.dumps(record['crewai_result'])
            
            processed_record = {
                'user_id': str(record.get('user_id', '')),
                'video': str(record.get('video', '')),
                'file_path': str(record.get('file_path', '')),
                'duration': float(record.get('duration', 0.0)),
                'fps': float(record.get('fps', 0.0)),
                'resolution': str(record.get('resolution', '')),
                'query': str(record.get('query', '')),
                'metadata': record.get('metadata', '{}'),
                'crewai_result': record.get('crewai_result', '{}'),
                'tokens_used': int(record.get('tokens_used', 0)),
                'context': str(record.get('context', 'Video analysis')),
                'timestamp': record['timestamp']
            }
            processed_records.append(processed_record)
        
        table.insert(processed_records)
        return True
        
    except Exception as e:
        print(f"Error batch inserting video records: {e}")
        return False

# =============================================================================
# 🔊 AUDIO AGENT INSERT FUNCTIONS
# =============================================================================

def insert_audio_record(
    user_id: str,
    audio_path: str,
    duration: float,
    sample_rate: int,
    channels: int,
    format: str,
    query: str,
    crewai_result: Dict[str, Any],
    tokens_used: int,
    context: str = "Audio analysis",
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Insert a single audio analysis record
    """
    try:
        table = pxt.get_table('demo.audio')
        
        # Convert complex objects to JSON strings
        metadata_json = json.dumps(metadata or {})
        crewai_result_json = json.dumps(crewai_result)
        
        record = {
            'user_id': str(user_id),
            'audio': str(audio_path),
            'file_path': str(audio_path),
            'duration': float(duration),
            'sample_rate': int(sample_rate),
            'channels': int(channels),
            'format': str(format),
            'query': str(query),
            'metadata': metadata_json,
            'crewai_result': crewai_result_json,
            'tokens_used': int(tokens_used),
            'context': str(context),
            'timestamp': datetime.now()
        }
        
        table.insert([record])
        return True
        
    except Exception as e:
        print(f"Error inserting audio record: {e}")
        return False

def batch_insert_audio(records: List[Dict[str, Any]]) -> bool:
    """
    Insert multiple audio records at once
    """
    try:
        table = pxt.get_table('demo.audio')
        
        processed_records = []
        for record in records:
            if 'timestamp' not in record:
                record['timestamp'] = datetime.now()
            
            # Convert complex objects to JSON strings
            if 'metadata' in record and isinstance(record['metadata'], dict):
                record['metadata'] = json.dumps(record['metadata'])
            if 'crewai_result' in record and isinstance(record['crewai_result'], dict):
                record['crewai_result'] = json.dumps(record['crewai_result'])
            
            processed_record = {
                'user_id': str(record.get('user_id', '')),
                'audio': str(record.get('audio', '')),
                'file_path': str(record.get('file_path', '')),
                'duration': float(record.get('duration', 0.0)),
                'sample_rate': int(record.get('sample_rate', 44100)),
                'channels': int(record.get('channels', 2)),
                'format': str(record.get('format', '')),
                'query': str(record.get('query', '')),
                'metadata': record.get('metadata', '{}'),
                'crewai_result': record.get('crewai_result', '{}'),
                'tokens_used': int(record.get('tokens_used', 0)),
                'context': str(record.get('context', 'Audio analysis')),
                'timestamp': record['timestamp']
            }
            processed_records.append(processed_record)
        
        table.insert(processed_records)
        return True
        
    except Exception as e:
        print(f"Error batch inserting audio records: {e}")
        return False

# =============================================================================
# 📊 MASTER TRACKING INSERT FUNCTIONS
# =============================================================================

def insert_tracking_record(
    user_id: str,
    agent_type: str,
    table_name: str,
    record_id: str,
    query: str,
    tokens_used: int,
    processing_time: float,
    success: bool = True,
    error_message: Optional[str] = None
) -> bool:
    """
    Insert a tracking record for monitoring agent performance
    """
    try:
        table = pxt.get_table('demo.agent_tracking')
        
        record = {
            'user_id': str(user_id),
            'agent_type': str(agent_type),
            'table_name': str(table_name),
            'record_id': str(record_id),
            'query': str(query),
            'tokens_used': int(tokens_used),
            'processing_time': float(processing_time),
            'success': bool(success),
            'error_message': str(error_message) if error_message else None,
            'timestamp': datetime.now()
        }
        
        table.insert([record])
        return True
        
    except Exception as e:
        print(f"Error inserting tracking record: {e}")
        return False

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_user_records(user_id: str, agent_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Get all records for a specific user
    """
    try:
        results = {}
        
        if agent_type:
            # Get records from specific agent type
            table_map = {
                'image': 'demo.images',
                'document': 'demo.documents',
                'video': 'demo.videos',
                'audio': 'demo.audio'
            }
            
            if agent_type in table_map:
                table = pxt.get_table(table_map[agent_type])
                records = table.where(table.user_id == user_id).collect()
                results[agent_type] = records
        else:
            # Get records from all tables
            tables = ['demo.images', 'demo.documents', 'demo.videos', 'demo.audio']
            for table_name in tables:
                try:
                    table = pxt.get_table(table_name)
                    records = table.where(table.user_id == user_id).collect()
                    results[table_name] = records
                except Exception as e:
                    print(f"Could not access table {table_name}: {e}")
                    continue
        
        return results
        
    except Exception as e:
        print(f"Error getting user records: {e}")
        return {}

def get_token_usage_summary(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get token usage summary across all agents
    """
    try:
        tracking_table = pxt.get_table('demo.agent_tracking')
        
        if user_id:
            records = tracking_table.where(tracking_table.user_id == user_id).collect()
        else:
            records = tracking_table.collect()
        
        # Convert to pandas for easy analysis
        df = records
        
        if len(df) == 0:
            return {
                'total_tokens': 0,
                'avg_tokens_per_request': 0,
                'tokens_by_agent': {},
                'total_requests': 0,
                'avg_processing_time': 0,
                'success_rate': 0
            }
        
        try:
            summary = {
                'total_tokens': int(df['tokens_used'].sum()),
                'avg_tokens_per_request': float(df['tokens_used'].mean()),
                'tokens_by_agent': df.groupby('agent_type')['tokens_used'].sum().to_dict(),
                'total_requests': len(df),
                'avg_processing_time': float(df['processing_time'].mean()),
                'success_rate': float((df['success'].sum() / len(df)) * 100)
            }
        except Exception as e:
            print(f"Error calculating summary stats: {e}")
            summary = {
                'total_tokens': 0,
                'avg_tokens_per_request': 0,
                'tokens_by_agent': {},
                'total_requests': len(df),
                'avg_processing_time': 0,
                'success_rate': 0
            }
        
        return summary
        
    except Exception as e:
        print(f"Error getting token usage summary: {e}")
        return {}

# =============================================================================
# SAFE JSON CONVERSION HELPERS
# =============================================================================

def safe_json_dumps(obj: Any) -> str:
    """
    Safely convert an object to JSON string, handling non-serializable objects
    """
    try:
        return json.dumps(obj, default=str)
    except Exception as e:
        print(f"JSON serialization error: {e}")
        return json.dumps({"error": f"Could not serialize: {str(e)}"})

def safe_json_loads(json_str: str) -> Any:
    """
    Safely load JSON string back to object
    """
    try:
        return json.loads(json_str)
    except Exception as e:
        print(f"JSON deserialization error: {e}")
        return {"error": f"Could not deserialize: {str(e)}"}

# =============================================================================
# EXAMPLE USAGE FUNCTIONS
# =============================================================================

def example_image_insert():
    """Example of how to use image insert function"""
    return insert_image_record(
        user_id="user123",
        image_path="/uploads/images/sample.jpg",
        query="What objects are in this image?",
        crewai_result={
            "objects": ["car", "tree", "person"],
            "confidence": 0.95
        },
        tokens_used=150,
        context="Object detection",
        metadata={
            "file_size_mb": 2.5,
            "resolution": "1920x1080"
        }
    )

if __name__ == "__main__":
    # Test the functions
    print("Testing fixed insert functions...")
    
    # Test single insert
    print("✅ Image insert:", example_image_insert())
    
    # Test utility functions
    print("📊 Token usage summary:", get_token_usage_summary())
    print("👤 User records:", get_user_records("user123"))