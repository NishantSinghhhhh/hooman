import os
import base64
import shutil
import uuid
from typing import Dict, Any, Optional
from crewai import Agent, Task, Crew
import openai
from pathlib import Path
import time
import requests
import json

# Import the Pixeltable insert functions
try:
    from src.ingestor.ingestor import (
        insert_image_record,
        insert_tracking_record,
        get_token_usage_summary
    )
    PIXELTABLE_AVAILABLE = True
    print("✅ Pixeltable integration loaded")
except ImportError:
    print("⚠️ Pixeltable integration not available - continuing without database storage")
    PIXELTABLE_AVAILABLE = False

class ImageAgent:
    """Specialized agent for image processing and analysis."""
    
    def __init__(self):
        """Initialize the Image Agent with OpenAI client."""
        self.openai_client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Create data directory if it doesn't exist
        self.data_dir = os.path.join(os.getcwd(), "data", "images")
        os.makedirs(self.data_dir, exist_ok=True)
        print(f"📁 Data directory: {self.data_dir}")
        print("✅ ImageAgent initialized with OpenAI integration")

    def save_image_to_data_folder(self, source_image_path: str, user_id: str = "anonymous") -> str:
        """
        Save the image to the data folder with a unique name.
        
        Args:
            source_image_path: Original path of the image
            user_id: User identifier for organizing files
            
        Returns:
            str: New path in the data folder
        """
        try:
            # Get original filename and extension
            original_filename = os.path.basename(source_image_path)
            name, ext = os.path.splitext(original_filename)
            
            # Create unique filename with timestamp and UUID
            timestamp = int(time.time())
            unique_id = str(uuid.uuid4())[:8]
            new_filename = f"{user_id}_{timestamp}_{unique_id}_{name}{ext}"
            
            # Create full path in data folder
            new_path = os.path.join(self.data_dir, new_filename)
            
            # Copy the image to data folder
            shutil.copy2(source_image_path, new_path)
            
            print(f"💾 Image saved to data folder: {new_filename}")
            return new_path
            
        except Exception as e:
            print(f"❌ Error saving image to data folder: {str(e)}")
            # Return original path if save fails
            return source_image_path

    def cleanup_temp_file(self, file_path: str) -> None:
        """
        Clean up temporary file if it's not in the data folder.
        
        Args:
            file_path: Path to the file to clean up
        """
        try:
            # Only delete if it's not in our data folder and exists
            if not file_path.startswith(self.data_dir) and os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️ Cleaned up temporary file: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"⚠️ Could not clean up temporary file: {str(e)}")

    def encode_image_to_base64(self, image_path: str) -> Optional[str]:
        """Convert image to base64 for OpenAI Vision API."""
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            print(f"❌ Error encoding image: {str(e)}")
            return None

    def get_image_mime_type(self, image_path: str) -> str:
        """Determine the MIME type of the image."""
        image_ext = Path(image_path).suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', 
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        return mime_types.get(image_ext, 'image/jpeg')

    def get_image_info(self, image_path: str) -> Dict[str, Any]:
        """Get detailed information about the image file."""
        try:
            file_stats = os.stat(image_path)
            
            # Try to get image dimensions using PIL if available
            try:
                from PIL import Image
                with Image.open(image_path) as img:
                    width, height = img.size
                    mode = img.mode
            except ImportError:
                print("📝 Note: Install Pillow for image dimension detection")
                width, height, mode = None, None, None
            except Exception as e:
                print(f"⚠️ Could not get image dimensions: {str(e)}")
                width, height, mode = None, None, None
            
            return {
                "filename": os.path.basename(image_path),
                "file_size": file_stats.st_size,
                "mime_type": self.get_image_mime_type(image_path),
                "width": width,
                "height": height,
                "mode": mode,
                "created_time": file_stats.st_ctime,
                "modified_time": file_stats.st_mtime,
                "data_folder_path": image_path if image_path.startswith(self.data_dir) else None
            }
            
        except Exception as e:
            print(f"❌ Error getting image info: {str(e)}")
            return {
                "filename": os.path.basename(image_path),
                "error": str(e)
            }

    def analyze_image_with_openai(self, image_path: str, query: str) -> Dict[str, Any]:
        """Analyze image using OpenAI Vision API."""
        try:
            print(f"🔍 Analyzing image with OpenAI Vision API...")
            print(f"📁 Image: {os.path.basename(image_path)}")
            print(f"❓ Query: {query}")
            
            # Encode image to base64
            base64_image = self.encode_image_to_base64(image_path)
            if not base64_image:
                return {
                    "success": False,
                    "error": "Failed to encode image to base64",
                    "tokens_used": 0
                }
            
            # Get MIME type
            mime_type = self.get_image_mime_type(image_path)
            
            # Create the prompt based on query
            if query and query.strip():
                prompt = (
                    f"User Query: {query}\n\n"
                    f"Please analyze this image and provide a detailed response to the user's question. "
                    f"Include specific observations about what you see in the image that relates to their query."
                )
            else:
                prompt = (
                    "Please provide a comprehensive analysis of this image. Describe:\n"
                    "1. Main objects, people, or subjects\n"
                    "2. Setting, environment, or background\n"
                    "3. Colors, lighting, and composition\n"
                    "4. Any text or written content\n"
                    "5. Notable details or interesting features\n"
                    "6. Overall mood, style, or artistic elements"
                )
            
            # Call OpenAI Vision API
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1500,
                temperature=0.3
            )
            
            analysis = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else 0
            
            return {
                "success": True,
                "analysis": analysis,
                "model_used": "gpt-4o",
                "tokens_used": tokens_used,
                "image_info": {
                    "filename": os.path.basename(image_path),
                    "mime_type": mime_type,
                    "file_size": os.path.getsize(image_path)
                }
            }
            
        except Exception as e:
            print(f"❌ OpenAI Vision API error: {str(e)}")
            return {
                "success": False,
                "error": f"OpenAI Vision API error: {str(e)}",
                "tokens_used": 0
            }

    def create_analysis_agent(self) -> Agent:
        """Create a specialized image analysis agent."""
        return Agent(
            role='Senior Image Analysis Expert',
            goal='Provide comprehensive and accurate analysis of visual content',
            backstory=(
                "You are a highly skilled Image Analysis Expert with expertise in computer vision, "
                "art analysis, object detection, and visual interpretation. You excel at describing "
                "images in detail, identifying objects, people, text, emotions, and artistic elements. "
                "You provide both technical analysis and intuitive insights about visual content."
            ),
            verbose=True,
            allow_delegation=False
        )

    def create_response_formatter_agent(self) -> Agent:
        """Create an agent to format and enhance the response."""
        return Agent(
            role='Response Formatting Specialist',
            goal='Transform image analysis into well-structured, user-friendly responses',
            backstory=(
                "You are a Response Formatting Specialist who excels at taking technical image "
                "analysis and transforming it into clear, engaging, and well-structured responses. "
                "You ensure that the final output directly addresses the user's query while "
                "providing valuable insights in an accessible format."
            ),
            verbose=True,
            allow_delegation=False
        )

    def enhance_analysis_with_crew(self, openai_analysis: Dict[str, Any], query: str, image_path: str) -> Dict[str, Any]:
        """Enhance the OpenAI analysis using CrewAI agents."""
        try:
            print("🤖 Enhancing analysis with CrewAI agents...")
            
            # Create agents
            analysis_agent = self.create_analysis_agent()
            formatter_agent = self.create_response_formatter_agent()
            
            # Create enhancement task
            enhancement_task = Task(
                description=(
                    f"Based on the OpenAI Vision analysis provided below, enhance and expand the analysis:\n\n"
                    f"Original Analysis: {openai_analysis.get('analysis', 'No analysis available')}\n\n"
                    f"User Query: {query}\n"
                    f"Image File: {os.path.basename(image_path)}\n\n"
                    f"Your tasks:\n"
                    f"1. Review and validate the OpenAI analysis\n"
                    f"2. Add additional insights or observations\n"
                    f"3. Provide relevant context or background information\n"
                    f"4. Ensure the analysis directly addresses the user's specific question\n"
                    f"5. Identify potential applications, implications, or interesting details"
                ),
                expected_output=(
                    "An enhanced image analysis that builds upon the OpenAI analysis, "
                    "providing additional insights, context, and directly addressing the user's query."
                ),
                agent=analysis_agent
            )
            
            # Create formatting task
            formatting_task = Task(
                description=(
                    f"Using the enhanced analysis from the previous task, create a comprehensive response:\n\n"
                    f"User's Original Query: {query}\n\n"
                    f"Requirements:\n"
                    f"1. Directly answer the user's question\n"
                    f"2. Provide clear, well-structured information\n"
                    f"3. Use engaging and accessible language\n"
                    f"4. Highlight key findings and insights\n"
                    f"5. Maintain a professional yet conversational tone\n"
                    f"6. Include a brief summary of main points"
                ),
                expected_output=(
                    "A comprehensive, well-structured response that directly addresses the user's query "
                    "about the image, presented in a clear and engaging format."
                ),
                agent=formatter_agent
            )
            
            # Create and execute crew
            crew = Crew(
                agents=[analysis_agent, formatter_agent],
                tasks=[enhancement_task, formatting_task],
                verbose=True
            )
            
            print("🚀 Executing CrewAI enhancement workflow...")
            result = crew.kickoff()
            
            # Get crew tokens
            crew_tokens = getattr(crew.usage_metrics, 'total_tokens', 0) if hasattr(crew, 'usage_metrics') else 0
            
            return {
                "success": True,
                "enhanced_analysis": str(result),
                "tokens_used": crew_tokens,
                "agents_used": ["analysis_expert", "response_formatter"]
            }
            
        except Exception as e:
            print(f"❌ CrewAI enhancement error: {str(e)}")
            return {
                "success": False,
                "error": f"CrewAI enhancement error: {str(e)}",
                "tokens_used": 0
            }

    def store_to_pixeltable(self, image_path: str, query: str, result: Dict[str, Any], user_id: str, processing_time: float, success: bool) -> bool:
        """Store the image processing results to Pixeltable database."""
        if not PIXELTABLE_AVAILABLE:
            print("⚠️ Pixeltable not available - skipping database storage")
            return False
            
        try:
            print("💾 Storing results to Pixeltable database...")
            tokens_used = result.get('tokens', 0)  # Get tokens from top level
            
            if success and 'result' in result:
                # Extract image and technical information
                result_data = result['result']
                technical_details = result_data.get('technical_details', {})
                
                # Get detailed image info
                detailed_info = self.get_image_info(image_path)
                
                # Prepare CrewAI result
                crewai_result = {
                    "primary_analysis": result_data.get('primary_analysis', result_data.get('analysis', '')),
                    "enhanced_response": result_data.get('enhanced_response', ''),
                    "query_details": result_data.get('query_details', {}),
                    "status": result_data.get('status', {}),
                    "processing_method": result.get('processing_method', 'unknown')
                }
                
                # Prepare metadata
                metadata = {
                    "filename": detailed_info.get('filename', os.path.basename(image_path)),
                    "file_size_bytes": detailed_info.get('file_size', 0),
                    "mime_type": detailed_info.get('mime_type', 'unknown'),
                    "width": detailed_info.get('width'),
                    "height": detailed_info.get('height'),
                    "image_mode": detailed_info.get('mode'),
                    "model_used": technical_details.get('model_used', 'gpt-4o'),
                    "enhancement_agents": technical_details.get('enhancement_agents', []),
                    "processing_time_seconds": processing_time,
                    "created_time": detailed_info.get('created_time'),
                    "modified_time": detailed_info.get('modified_time'),
                    "stored_in_data_folder": image_path.startswith(self.data_dir)
                }
                
                # Insert image record
                image_success = insert_image_record(
                    user_id=user_id,
                    image_path=image_path,
                    query=query,
                    crewai_result=crewai_result,
                    tokens_used=int(tokens_used),
                    context=f"Image analysis - {result.get('processing_method', 'full_processing')}",
                    metadata=metadata
                )
                
                # Insert tracking record
                tracking_success = insert_tracking_record(
                    user_id=user_id,
                    agent_type='image',
                    table_name='demo.images',
                    record_id=f"img_{int(time.time())}",
                    query=query,
                    tokens_used=int(tokens_used),
                    processing_time=processing_time,
                    success=True,
                    error_message=None
                )
                
                print(f"✅ Database storage - Image: {image_success}, Tracking: {tracking_success}")
                return image_success and tracking_success
                
            else:
                # Store failed processing attempt
                error_message = result.get('error', 'Unknown error occurred')
                
                tracking_success = insert_tracking_record(
                    user_id=user_id,
                    agent_type='image',
                    table_name='demo.images',
                    record_id=f"img_failed_{int(time.time())}",
                    query=query,
                    tokens_used=0,
                    processing_time=processing_time,
                    success=False,
                    error_message=error_message
                )
                
                print(f"⚠️ Failed processing stored in tracking - Success: {tracking_success}")
                return tracking_success
                
        except Exception as e:
            print(f"❌ Database storage error: {str(e)}")
            return False

    def quick_analyze(self, image_path: str, query: str = "", user_id: str = "anonymous") -> Dict[str, Any]:
        """
        Quick analysis using only OpenAI Vision (faster processing) with database storage.
        
        Args:
            image_path: Path to the image file (will be saved to data folder)
            query: User's query about the image
            user_id: User identifier for database storage
            
        Returns:
            Dictionary containing the analysis results
        """
        start_time = time.time()
        original_path = image_path
        
        try:
            print(f"⚡ Starting quick image analysis...")
            print(f"👤 User: {user_id}")
            
            # Step 1: Save image to data folder
            saved_image_path = self.save_image_to_data_folder(image_path, user_id)
            
            # Step 2: Analyze with OpenAI Vision only
            openai_result = self.analyze_image_with_openai(saved_image_path, query)
            processing_time = time.time() - start_time
            
            if not openai_result.get("success"):
                error_result = {
                    'success': False,
                    'tokens': 0,  # No tokens on error
                    'result': {
                        'error': openai_result.get("error", "Failed to analyze image"),
                        'processing_time': processing_time
                    },
                    'query': query,
                    'file_processed': True,
                    'error': openai_result.get("error")
                }
                
                # Store failed attempt to database
                self.store_to_pixeltable(saved_image_path, query, error_result, user_id, processing_time, False)
                
                # Clean up temp file if different from saved path
                if original_path != saved_image_path:
                    self.cleanup_temp_file(original_path)
                
                return error_result
            
            total_tokens = openai_result.get("tokens_used", 0)
            
            result_data = {
                "analysis": openai_result.get("analysis", ""),
                "technical_details": {
                    "model_used": openai_result.get("model_used", "gpt-4o"),
                    "tokens_used": total_tokens,
                    "processing_time": f"{processing_time:.2f}s"
                },
                "image_info": openai_result.get("image_info", {}),
                "file_paths": {
                    "original_path": original_path,
                    "data_folder_path": saved_image_path,
                    "saved_to_data_folder": True
                },
                "processing_mode": "quick_analysis"
            }
            
            success_result = {
                'success': True,
                'tokens': total_tokens,  # TOP LEVEL TOKEN COUNT
                'result': result_data,
                'query': query,
                'file_processed': True,
                'processing_method': 'openai_vision_only',
                'processing_time': processing_time
            }
            
            # Step 3: Store results to database (using data folder path)
            db_success = self.store_to_pixeltable(saved_image_path, query, success_result, user_id, processing_time, True)
            
            # Step 4: Clean up temp file if different from saved path
            if original_path != saved_image_path:
                self.cleanup_temp_file(original_path)
            
            print(f"📊 Total tokens used: {total_tokens}")
            if db_success:
                print(f"⚡ Quick analysis completed and stored in {processing_time:.2f}s")
            else:
                print(f"⚠️ Quick analysis completed but database storage failed in {processing_time:.2f}s")
            
            return success_result
            
        except Exception as e:
            processing_time = time.time() - start_time
            print(f"❌ Quick analysis failed: {str(e)}")
            
            error_result = {
                'success': False,
                'tokens': 0,  # No tokens on error
                'result': {
                    'error': f'Quick analysis error: {str(e)}',
                    'processing_time': processing_time
                },
                'query': query,
                'file_processed': True,
                'error': str(e),
                'processing_time': processing_time
            }
            
            # Try to store failed attempt and clean up
            try:
                saved_path = self.save_image_to_data_folder(original_path, user_id)
                self.store_to_pixeltable(saved_path, query, error_result, user_id, processing_time, False)
                if original_path != saved_path:
                    self.cleanup_temp_file(original_path)
            except:
                pass
            
            return error_result

    def process_image(self, image_path: str, query: str = "", user_id: str = "anonymous") -> Dict[str, Any]:
        """
        Main method to process an image with query and store results in database.
        
        Args:
            image_path: Path to the image file (will be saved to data folder)
            query: User's query about the image
            user_id: User identifier for database storage
            
        Returns:
            Dictionary containing the analysis results
        """
        start_time = time.time()
        original_path = image_path
        
        try:
            print(f"🖼️ Starting image processing...")
            print(f"📁 Original file: {os.path.basename(image_path)}")
            print(f"❓ Query: {query or 'General analysis'}")
            print(f"👤 User: {user_id}")
            
            # Step 1: Save image to data folder
            saved_image_path = self.save_image_to_data_folder(image_path, user_id)
            
            # Step 2: Analyze with OpenAI Vision
            openai_result = self.analyze_image_with_openai(saved_image_path, query)
            
            if not openai_result.get("success"):
                processing_time = time.time() - start_time
                error_result = {
                    'success': False,
                    'tokens': 0,  # No tokens on error
                    'result': {
                        'error': openai_result.get("error", "Failed to analyze image"),
                        'agent_used': 'openai_vision',
                        'processing_time': processing_time
                    },
                    'query': query,
                    'file_processed': True,
                    'error': openai_result.get("error")
                }
                
                # Store failed attempt to database
                self.store_to_pixeltable(saved_image_path, query, error_result, user_id, processing_time, False)
                
                # Clean up temp file if different from saved path
                if original_path != saved_image_path:
                    self.cleanup_temp_file(original_path)
                
                return error_result
            
            # Step 3: Enhance with CrewAI (optional, can be disabled for faster processing)
            crew_result = self.enhance_analysis_with_crew(openai_result, query, saved_image_path)
            
            # Step 4: Calculate total tokens
            processing_time = time.time() - start_time
            openai_tokens = openai_result.get("tokens_used", 0)
            crew_tokens = crew_result.get("tokens_used", 0) if crew_result.get("success") else 0
            total_tokens = openai_tokens + crew_tokens
            
            final_result = {
                "primary_analysis": openai_result.get("analysis", ""),
                "enhanced_response": crew_result.get("enhanced_analysis", "") if crew_result.get("success") else "",
                "technical_details": {
                    "model_used": openai_result.get("model_used", "gpt-4o"),
                    "tokens_used": total_tokens,
                    "token_breakdown": {
                        "openai_vision": openai_tokens,
                        "crew_enhancement": crew_tokens
                    },
                    "processing_time": f"{processing_time:.2f}s",
                    "enhancement_agents": crew_result.get("agents_used", [])
                },
                "image_info": openai_result.get("image_info", {}),
                "file_paths": {
                    "original_path": original_path,
                    "data_folder_path": saved_image_path,
                    "saved_to_data_folder": True
                },
                "query_details": {
                    "original_query": query,
                    "query_type": "specific" if query and query.strip() else "general_analysis"
                },
                "status": {
                    "openai_analysis": "completed",
                    "crew_enhancement": "completed" if crew_result.get("success") else "failed",
                    "overall": "success"
                }
            }
            
            success_result = {
                'success': True,
                'tokens': total_tokens,  # TOP LEVEL TOKEN COUNT
                'result': final_result,
                'query': query,
                'file_processed': True,
                'processing_method': 'openai_vision + crewai_enhancement',
                'processing_time': processing_time
            }
            
            # Step 5: Store results to database (using data folder path)
            db_success = self.store_to_pixeltable(saved_image_path, query, success_result, user_id, processing_time, True)
            
            # Step 6: Clean up temp file if different from saved path
            if original_path != saved_image_path:
                self.cleanup_temp_file(original_path)
            
            print(f"📊 Total tokens used: {total_tokens}")
            if db_success:
                print(f"✅ Image processing completed and stored in {processing_time:.2f}s")
            else:
                print(f"⚠️ Image processing completed but database storage failed in {processing_time:.2f}s")
            
            return success_result
            
        except Exception as e:
            processing_time = time.time() - start_time
            print(f"❌ Image processing failed: {str(e)}")
            
            error_result = {
                'success': False,
                'tokens': 0,  # No tokens on error
                'result': {
                    'error': f'Image processing error: {str(e)}',
                    'processing_time': processing_time,
                    'query': query,
                    'agent_used': 'image_agent'
                },
                'query': query,
                'file_processed': True,
                'error': str(e),
                'processing_time': processing_time
            }
            
            # Try to store failed attempt and clean up
            try:
                saved_path = self.save_image_to_data_folder(original_path, user_id)
                self.store_to_pixeltable(saved_path, query, error_result, user_id, processing_time, False)
                if original_path != saved_path:
                    self.cleanup_temp_file(original_path)
            except:
                pass
            
            return error_result
        
    def store_image_to_mcp(image_path, query, crewai_result, mcp_url="http://localhost:8082/store_image", metadata=None, timeout=10):
        """
        Store image and analysis results in the image MCP server via HTTP POST.
        
        Args:
            image_path (str): Path to the image file.
            query (str): User's query about the image.
            crewai_result (dict): Analysis results (including model output, metadata, etc.).
            mcp_url (str): URL for the MCP server's store_image endpoint.
            metadata (dict|None): Additional metadata, if any.
            timeout (int): Request timeout in seconds.

        Returns:
            dict: Response from the MCP server.
        """
        payload = {
            "image_path": image_path,
            "query": query,
            "crewai_result": crewai_result,
            "metadata": metadata or {}
        }

        try:
            resp = requests.post(mcp_url, json=payload, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            print(f"❌ Error posting to MCP server: {e}")
            return {"success": False, "error": str(e)}

# Example usage
if __name__ == "__main__":
    # Initialize agent
    agent = ImageAgent()
    
    # Example with quick processing
    quick_result = agent.quick_analyze(
        image_path="/path/to/temp/image.jpg",
        query="What objects are visible in this image?",
        user_id="user123"
    )
    print(f"🔢 Tokens used in quick analysis: {quick_result.get('tokens', 0)}")
    
    # Example with full processing and database storage
    full_result = agent.process_image(
        image_path="/path/to/temp/image.jpg",
        query="What objects are visible in this image?",
        user_id="user123"
    )
    print(f"🔢 Tokens used in full analysis: {full_result.get('tokens', 0)}")
    
    # Check token usage summary if Pixeltable is available
    if PIXELTABLE_AVAILABLE:
        print("Token Usage Summary:", get_token_usage_summary())