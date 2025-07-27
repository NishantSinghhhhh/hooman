#!/usr/bin/env python3
"""
Image Ingestor using Pixeltable Best Practices
Handles image storage with OpenAI Vision and embeddings
"""

import pixeltable as pxt
from pixeltable.functions.openai import vision
from pixeltable.functions.huggingface import sentence_transformer
import os
from datetime import datetime
from pathlib import Path
import json
from typing import Dict, Any, Optional


class ImageIngestor:
    def __init__(self):
        """Initialize Pixeltable image ingestor with best practices."""
        self.app_name = "multimodal_ai"
        self.table_name = "images"
        self.full_table_path = f"{self.app_name}.{self.table_name}"
        
        # Configure embedding model (following best practices)
        self.embed_model = sentence_transformer.using(
            model_id="intfloat/e5-large-v2"
        )
        
        self.setup_table()
        print("✅ ImageIngestor initialized with Pixeltable best practices")

    def setup_table(self):
        """Set up Pixeltable table with computed columns and embeddings."""
        try:
            # Create directory if not exists - use create_dir which is idempotent
            pxt.create_dir(self.app_name)
            print(f"✅ Directory ensured: {self.app_name}")

            # Try to get existing table
            self.img_table = pxt.get_table(self.full_table_path)
            print(f"✅ Using existing table: {self.full_table_path}")
            
        except Exception:
            # Create new table structure
            print(f"🏗️ Creating new table structure...")

            # Create images table with schema
            self.img_table = pxt.create_table(
                self.full_table_path,
                {
                    "image": pxt.Image,
                    "file_path": pxt.String,
                    "query": pxt.String,
                    "metadata": pxt.Json,
                    "crewai_result": pxt.Json,
                    "timestamp": pxt.Timestamp
                }
            )
            print(f"✅ Created table: {self.full_table_path}")
            
            # Add OpenAI Vision analysis (best practice)
            self.img_table.add_computed_column(
                image_description=vision(
                    prompt="""Analyze this image comprehensively:
                    1. Main objects, people, or subjects present
                    2. Setting, environment, and background details
                    3. Colors, lighting, and visual composition
                    4. Any text, symbols, or written content
                    5. Notable details, emotions, or atmosphere
                    6. Artistic style or photographic characteristics""",
                    image=self.img_table.image,
                    model="gpt-4o-mini"
                )
            )
            print("✅ Added OpenAI Vision computed column")
            
            # Add embedding index for semantic search (best practice)
            self.img_table.add_embedding_index(
                column="image_description",
                string_embed=self.embed_model
            )
            print("✅ Added semantic search embedding index")
            
            # Add query embedding for query-based search
            self.img_table.add_embedding_index(
                column="query",
                string_embed=self.embed_model
            )
            print("✅ Added query embedding index")

    def ingest_image(self, 
                    image_path: str, 
                    query: str = "", 
                    crewai_result: Optional[Dict[str, Any]] = None,
                    metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Ingest image into Pixeltable with all metadata.
        
        Args:
            image_path: Path to image file
            query: User's query about the image
            crewai_result: Results from CrewAI processing
            metadata: Additional metadata
            
        Returns:
            Ingestion result with record ID
        """
        try:
            # Validate image exists
            if not os.path.exists(image_path):
                raise ValueError(f"Image file not found: {image_path}")
            
            # Prepare metadata
            file_stat = os.stat(image_path)
            auto_metadata = {
                "filename": os.path.basename(image_path),
                "file_size": file_stat.st_size,
                "file_extension": Path(image_path).suffix.lower(),
                "ingestion_timestamp": datetime.now().isoformat(),
                "agent_used": "ImageIngestor",
                **(metadata or {})
            }
            
            # Insert image into Pixeltable
            insert_result = self.img_table.insert([{
                "image": image_path,
                "file_path": image_path,
                "query": query or "",
                "metadata": auto_metadata,
                "crewai_result": crewai_result or {},
                "timestamp": datetime.now()
            }])
            
            # Get record ID
            record_id = None
            if hasattr(insert_result, 'inserted_rows') and insert_result.inserted_rows:
                record_id = insert_result.inserted_rows[0].get('id')
            
            result = {
                "success": True,
                "record_id": record_id,
                "message": f"Successfully ingested: {os.path.basename(image_path)}",
                "metadata": auto_metadata,
                "features": {
                    "vision_analysis": "auto-generated",
                    "semantic_search": "enabled",
                    "query_search": "enabled"
                }
            }
            
            print(f"✅ Ingested image: {os.path.basename(image_path)} (ID: {record_id})")
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e),
                "image_path": image_path
            }
            print(f"❌ Ingestion failed: {e}")
            return error_result

# Example usage if running standalone
if __name__ == "__main__":
    ingestor = ImageIngestor()

