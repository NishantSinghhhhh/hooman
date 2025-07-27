import pixeltable as pxt

# Create directory for tables
pxt.create_dir('demo')

# Base columns that all agent tables will have
base_columns = {
    'user_id': pxt.String,
    'query': pxt.String,
    'metadata': pxt.Json,
    'crewai_result': pxt.Json,
    'tokens_used': pxt.Int,
    'context': pxt.String,
    'timestamp': pxt.Timestamp
}

# 🖼️ Image Agent Table
image_columns = {
    'image': pxt.Image,
    'file_path': pxt.String,
    **base_columns
}

image_table = pxt.create_table('demo.images', image_columns)

# 📄 Document Agent Table
document_columns = {
    'document': pxt.Document,
    'file_path': pxt.String,
    'document_type': pxt.String,  # pdf, docx, txt, etc.
    'page_count': pxt.Int,
    **base_columns
}

document_table = pxt.create_table('demo.documents', document_columns)

# 🎞️ Video Agent Table
video_columns = {
    'video': pxt.Video,
    'file_path': pxt.String,
    'duration': pxt.Float,  # duration in seconds
    'fps': pxt.Float,
    'resolution': pxt.String,  # e.g., "1920x1080"
    **base_columns
}

video_table = pxt.create_table('demo.videos', video_columns)

# 🔊 Audio Agent Table
audio_columns = {
    'audio': pxt.Audio,
    'file_path': pxt.String,
    'duration': pxt.Float,  # duration in seconds
    'sample_rate': pxt.Int,
    'channels': pxt.Int,
    'format': pxt.String,  # mp3, wav, etc.
    **base_columns
}

audio_table = pxt.create_table('demo.audio', audio_columns)

# Optional: Create a master tracking table for all agent interactions
master_tracking_columns = {
    'user_id': pxt.String,
    'agent_type': pxt.String,  # 'image', 'document', 'video', 'audio'
    'table_name': pxt.String,
    'record_id': pxt.String,
    'query': pxt.String,
    'tokens_used': pxt.Int,
    'processing_time': pxt.Float,  # time in seconds
    'success': pxt.Bool,
    'error_message': pxt.String,
    'timestamp': pxt.Timestamp
}

master_table = pxt.create_table('demo.agent_tracking', master_tracking_columns)

print("✅ All agent tables created successfully!")
print("\nTables created:")
print("🖼️  demo.images - Image Agent")
print("📄 demo.documents - Document Agent") 
print("🎞️  demo.videos - Video Agent")
print("🔊 demo.audio - Audio Agent")
print("📊 demo.agent_tracking - Master tracking table")

# Example of how to insert data into each table:

# Image Agent Example
"""
image_table.insert({
    'user_id': 'user123',
    'image': '/path/to/image.jpg',
    'file_path': '/path/to/image.jpg',
    'query': 'What objects are in this image?',
    'metadata': {'source': 'upload', 'size_mb': 2.5},
    'crewai_result': {'objects': ['car', 'tree', 'person'], 'confidence': 0.95},
    'tokens_used': 150,
    'context': 'Object detection task',
    'timestamp': pxt.functions.now()
})
"""

# Document Agent Example
"""
document_table.insert({
    'user_id': 'user123',
    'document': '/path/to/document.pdf',
    'file_path': '/path/to/document.pdf',
    'document_type': 'pdf',
    'page_count': 10,
    'query': 'Summarize the main points',
    'metadata': {'file_size': 1024000, 'language': 'en'},
    'crewai_result': {'summary': 'Document discusses...', 'key_points': [...]},
    'tokens_used': 500,
    'context': 'Document summarization',
    'timestamp': pxt.functions.now()
})
"""

# Video Agent Example
"""
video_table.insert({
    'user_id': 'user123',
    'video': '/path/to/video.mp4',
    'file_path': '/path/to/video.mp4',
    'duration': 120.5,
    'fps': 30.0,
    'resolution': '1920x1080',
    'query': 'What activities are happening in this video?',
    'metadata': {'codec': 'h264', 'bitrate': 5000},
    'crewai_result': {'activities': ['walking', 'talking'], 'scenes': [...]},
    'tokens_used': 800,
    'context': 'Video analysis',
    'timestamp': pxt.functions.now()
})
"""

# Audio Agent Example
"""
audio_table.insert({
    'user_id': 'user123',
    'audio': '/path/to/audio.wav',
    'file_path': '/path/to/audio.wav',
    'duration': 60.0,
    'sample_rate': 44100,
    'channels': 2,
    'format': 'wav',
    'query': 'Transcribe this audio',
    'metadata': {'quality': 'high', 'noise_level': 'low'},
    'crewai_result': {'transcript': 'Hello world...', 'confidence': 0.98},
    'tokens_used': 200,
    'context': 'Audio transcription',
    'timestamp': pxt.functions.now()
})
"""