# file: db_queries.py

from typing import Dict, List, Any
import pixeltable as pxt

# --- Synchronous Helper Functions ---

def _get_images(user_id: str) -> List[Dict[str, Any]]:
    try:
        tbl = pxt.get_table('demo.images')
        return tbl.where(tbl.user_id == user_id).select(
            tbl.file_path,
            tbl.query,
            tbl.tokens_used,
            tbl.context,
            tbl.timestamp,
            tbl.crewai_result #<-- Already added
        ).order_by(tbl.timestamp, asc=False).limit(50).collect()
    except Exception as e:
        print(f"Query failed for demo.images: {e}")
        return []

def _get_documents(user_id: str) -> List[Dict[str, Any]]:
    try:
        tbl = pxt.get_table('demo.documents')
        return tbl.where(tbl.user_id == user_id).select(
            tbl.file_path,
            tbl.query,
            tbl.document_type,
            tbl.page_count,
            tbl.tokens_used,
            tbl.timestamp,
            tbl.crewai_result # <-- ADD THIS LINE
        ).order_by(tbl.timestamp, asc=False).limit(50).collect()
    except Exception as e:
        print(f"Query failed for demo.documents: {e}")
        return []

def _get_videos(user_id: str) -> List[Dict[str, Any]]:
    try:
        tbl = pxt.get_table('demo.videos')
        return tbl.where(tbl.user_id == user_id).select(
            tbl.file_path,
            tbl.query,
            tbl.duration,
            tbl.resolution,
            tbl.tokens_used,
            tbl.timestamp,
            tbl.crewai_result # <-- ADD THIS LINE
        ).order_by(tbl.timestamp, asc=False).limit(50).collect()
    except Exception as e:
        print(f"Query failed for demo.videos: {e}")
        return []

def _get_audio(user_id: str) -> List[Dict[str, Any]]:
    try:
        tbl = pxt.get_table('demo.audio')
        return tbl.where(tbl.user_id == user_id).select(
            tbl.file_path,
            tbl.query,
            tbl.duration,
            tbl.format,
            tbl.tokens_used,
            tbl.timestamp,
            tbl.crewai_result # <-- ADD THIS LINE
        ).order_by(tbl.timestamp, asc=False).limit(50).collect()
    except Exception as e:
        print(f"Query failed for demo.audio: {e}")
        return []

def _get_activity(user_id: str) -> List[Dict[str, Any]]:
    """This table does not have a 'crewai_result' column."""
    try:
        tbl = pxt.get_table('demo.agent_tracking')
        return tbl.where(tbl.user_id == user_id).order_by(
            tbl.timestamp, asc=False
        ).limit(100).collect()
    except Exception as e:
        print(f"Query failed for demo.agent_tracking: {e}")
        return []

# =============================================================================
# Main SYNCHRONOUS Orchestrator
# =============================================================================
def get_all_user_data(user_id: str) -> Dict[str, Any]:
    """
    Fetches all user data sequentially and logs the count for each table.
    """
    images_data = _get_images(user_id)
    print(f"  🖼️  Found {len(images_data)} image records.")

    docs_data = _get_documents(user_id)
    print(f"  📄  Found {len(docs_data)} document records.")

    videos_data = _get_videos(user_id)
    print(f"  🎞️  Found {len(videos_data)} video records.")

    audio_data = _get_audio(user_id)
    print(f"  🔊  Found {len(audio_data)} audio records.")

    activity_summary = _get_activity(user_id)
    print(f"  📊  Found {len(activity_summary)} activity tracking records.")

    total_records = len(images_data) + len(docs_data) + len(videos_data) + len(audio_data)

    return {
        "user_id": user_id,
        "total_records": total_records,
        "images": images_data,
        "documents": docs_data,
        "videos": videos_data,
        "audio": audio_data,
        "activity_summary": activity_summary
    }