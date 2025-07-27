import os
import time
import uuid
import shutil
import json
import tempfile
import subprocess
from typing import Dict, Any, Optional, List
from crewai import Agent, Task, Crew
import openai
from pathlib import Path
import base64

try:
    from src.ingestor.ingestor import (
        insert_video_record,
        insert_tracking_record,
        get_user_records,
        get_token_usage_summary,
    )
    PIXELTABLE_AVAILABLE = True
    print("✅ Pixeltable integration loaded for VideoAgent")
except ImportError:
    print("⚠️ Pixeltable integration not available - continuing without database storage")
    PIXELTABLE_AVAILABLE = False

class VideoAgent:
    """Specialized agent for video processing and analysis."""
    
    def __init__(self):
        """Initialize the Video Agent with OpenAI client."""
        self.openai_client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        # Create data directory if it doesn't exist
        self.data_dir = os.path.join(os.getcwd(), "data", "videos")
        os.makedirs(self.data_dir, exist_ok=True)
        print(f"📁 Data directory for videos: {self.data_dir}")
        print("✅ VideoAgent initialized with OpenAI integration")

    def save_video_to_data_folder(self, source_path: str, user_id: str = "anonymous") -> str:
        """Saves the video to the data folder with a unique name."""
        try:
            original_filename = os.path.basename(source_path)
            name, ext = os.path.splitext(original_filename)
            timestamp = int(time.time())
            unique_id = str(uuid.uuid4())[:8]
            new_filename = f"{user_id}_{timestamp}_{unique_id}_{name}{ext}"
            new_path = os.path.join(self.data_dir, new_filename)
            shutil.copy2(source_path, new_path)
            print(f"💾 Video saved to data folder: {new_filename}")
            return new_path
        except Exception as e:
            print(f"❌ Error saving video to data folder: {str(e)}")
            return source_path

    def cleanup_temp_file(self, file_path: str) -> None:
        """Cleans up a temporary file if it's not in the data folder."""
        try:
            if not file_path.startswith(self.data_dir) and os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️ Cleaned up temporary file: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"⚠️ Could not clean up temporary file: {str(e)}")

    def get_video_info(self, video_path: str) -> Dict[str, Any]:
        """Get basic information about the video file using ffprobe."""
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            metadata = json.loads(result.stdout)
            video_stream = next((s for s in metadata.get('streams', []) if s.get('codec_type') == 'video'), None)
            
            if not video_stream:
                return {"error": "No video stream found"}

            duration_str = video_stream.get('duration', metadata.get('format', {}).get('duration', '0'))
            
            return {
                "filename": os.path.basename(video_path),
                "format": Path(video_path).suffix.lower(),
                "file_size_bytes": int(metadata.get('format', {}).get('size', 0)),
                "duration": float(duration_str),
                "resolution": f"{video_stream.get('width')}x{video_stream.get('height')}",
                "fps": eval(video_stream.get('r_frame_rate', '0/1')),
                "video_codec": video_stream.get('codec_name'),
            }
        except (FileNotFoundError, subprocess.CalledProcessError, Exception) as e:
            print(f"⚠️ Could not get video metadata with ffprobe: {e}. Ensure ffmpeg is installed.")
            return {"filename": os.path.basename(video_path), "file_size_bytes": os.path.getsize(video_path)}

    def extract_frames(self, video_path: str, num_frames: int = 6) -> List[str]:
        """Extract key frames from video using ffmpeg."""
        temp_dir = tempfile.mkdtemp()
        frame_paths = []
        try:
            print(f"🎬 Extracting {num_frames} frames from video...")
            video_info = self.get_video_info(video_path)
            duration = video_info.get('duration', 0)
            if duration <= 0:
                raise ValueError("Could not determine video duration for frame extraction.")

            interval = duration / (num_frames + 1)
            for i in range(1, num_frames + 1):
                timestamp = interval * i
                frame_path = os.path.join(temp_dir, f"frame_{i:03d}.jpg")
                cmd = ['ffmpeg', '-ss', str(timestamp), '-i', video_path, '-vframes', '1', '-q:v', '2', frame_path, '-y']
                subprocess.run(cmd, capture_output=True, text=True, check=True)
                if os.path.exists(frame_path):
                    frame_paths.append(frame_path)
            
            print(f"✅ Successfully extracted {len(frame_paths)} frames to {temp_dir}")
            return frame_paths
        except (FileNotFoundError, subprocess.CalledProcessError, Exception) as e:
            print(f"❌ Error extracting frames: {e}")
            self.cleanup_frame_dir(frame_paths)
            return []

    def cleanup_frame_dir(self, frame_paths: List[str]):
        """Cleans up the temporary directory containing extracted frames."""
        if not frame_paths:
            return
        temp_dir = os.path.dirname(frame_paths[0])
        try:
            shutil.rmtree(temp_dir)
            print(f"🗑️ Cleaned up temporary frame directory: {temp_dir}")
        except OSError as e:
            print(f"⚠️ Could not clean up frame directory {temp_dir}: {e}")

    def encode_image_to_base64(self, image_path: str) -> Optional[str]:
        """Convert image to base64 for OpenAI Vision API."""
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            print(f"❌ Error encoding frame: {str(e)}")
            return None

    def analyze_frames_with_openai(self, frame_paths: List[str], query: str, video_info: Dict) -> Dict[str, Any]:
        """Analyze video frames using OpenAI Vision API."""
        try:
            print(f"🔍 Analyzing {len(frame_paths)} frames with OpenAI Vision...")
            if not frame_paths:
                return {"success": False, "error": "No frames available for analysis"}

            images_content = []
            for frame_path in frame_paths:
                base64_image = self.encode_image_to_base64(frame_path)
                if base64_image:
                    images_content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}})

            if not images_content:
                return {"success": False, "error": "Could not process any frames for analysis"}

            prompt = query or "Provide a comprehensive analysis of these video frames, describing the scene, objects, actions, and overall narrative."
            full_prompt = f"Analyze these frames from a video. User query: '{prompt}'"
            
            message_content = [{"type": "text", "text": full_prompt}] + images_content
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": message_content}],
                max_tokens=1500,
                temperature=0.3
            )
            
            analysis = response.choices[0].message.content
            return {
                "success": True, "analysis": analysis, "model_used": "gpt-4o",
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "frames_analyzed": len(frame_paths)
            }
        except Exception as e:
            return {"success": False, "error": f"OpenAI video analysis error: {str(e)}"}

    def create_video_analysis_agent(self) -> Agent:
        """Create a specialized video analysis agent."""
        return Agent(
            role='Senior Video Content Analysis Expert',
            goal='Provide comprehensive and accurate analysis of video content and visual narratives',
            backstory=(
                "You are a highly skilled Video Content Analysis Expert with expertise in cinematography, "
                "visual storytelling, video production, and multimedia analysis. You excel at understanding "
                "video sequences, identifying key scenes, analyzing visual progression, and extracting insights "
                "from moving images."
            ),
            verbose=True,
            allow_delegation=False
        )

    def create_content_synthesizer_agent(self) -> Agent:
        """Create an agent to synthesize and format the final response."""
        return Agent(
            role='Video Content Synthesis Specialist',
            goal='Transform video analysis into user-friendly, comprehensive responses',
            backstory=(
                "You are a Video Content Synthesis Specialist who excels at taking complex video "
                "analysis and transforming it into clear, engaging, and well-structured responses."
            ),
            verbose=True,
            allow_delegation=False
        )

    def enhance_analysis_with_crew(self, openai_analysis: Dict[str, Any], query: str, video_path: str) -> Dict[str, Any]:
        """Enhance the OpenAI analysis using CrewAI agents."""
        try:
            print("🤖 Enhancing video analysis with CrewAI agents...")
            analysis_agent = self.create_video_analysis_agent()
            synthesizer_agent = self.create_content_synthesizer_agent()
            
            enhancement_task = Task(
                description=(
                    f"Based on the OpenAI video analysis provided below, enhance and expand the analysis:\n\n"
                    f"Original Analysis: {openai_analysis.get('analysis', 'No analysis available')}\n\n"
                    f"User Query: {query}\n"
                ),
                expected_output="An enhanced video analysis that builds upon the OpenAI analysis.",
                agent=analysis_agent
            )
            
            synthesis_task = Task(
                description="Using the enhanced analysis, create a comprehensive, user-friendly response.",
                expected_output="A comprehensive, well-structured response for the user.",
                agent=synthesizer_agent,
                context=[enhancement_task]
            )
            
            crew = Crew(agents=[analysis_agent, synthesizer_agent], tasks=[enhancement_task, synthesis_task], verbose=True)
            result = crew.kickoff()
            
            return {
                "success": True,
                "enhanced_analysis": str(result),
                "agents_used": ["video_analysis_expert", "content_synthesizer"],
                "tokens_used": crew.usage_metrics.get('total_tokens', 0)
            }
        except Exception as e:
            print(f"❌ CrewAI enhancement error: {str(e)}")
            return {"success": False, "error": f"CrewAI enhancement error: {str(e)}"}

    def store_to_pixeltable(self, video_path: str, query: str, result: Dict[str, Any], user_id: str, processing_time: float, success: bool) -> bool:
        """Stores the video processing results to Pixeltable."""
        if not PIXELTABLE_AVAILABLE:
            return False
        try:
            print("💾 Storing video results to Pixeltable database...")
            video_info = self.get_video_info(video_path)
            res_data = result.get('result', {})
            tech_details = res_data.get('technical_details', {})
            tokens_used = tech_details.get('tokens_used', 0)

            if success:
                crewai_result = {"primary_analysis": res_data.get('analysis', ''), "enhanced_response": res_data.get('enhanced_response', '')}
                insert_video_record(
                    user_id=user_id, video_path=video_path,
                    duration=video_info.get('duration', 0), fps=video_info.get('fps', 0),
                    resolution=video_info.get('resolution', ''), query=query,
                    crewai_result=crewai_result, tokens_used=int(tokens_used),
                    context=f"Video analysis - {result.get('processing_method', 'unknown')}",
                    metadata=video_info
                )
            
            insert_tracking_record(
                user_id=user_id, agent_type='video', table_name='demo.videos',
                record_id=f"vid_{int(time.time())}", query=query, tokens_used=int(tokens_used),
                processing_time=processing_time, success=success, error_message=result.get('error')
            )
            print("✅ Database storage completed successfully.")
            return True
        except Exception as e:
            print(f"❌ Database storage error: {str(e)}")
            return False

    def process_video(self, video_path: str, query: str = "", user_id: str = "anonymous") -> Dict[str, Any]:
        """Main method to process a video file with query and store results in database."""
        start_time = time.time()
        original_path = video_path
        saved_video_path = None
        frame_paths = []
        try:
            print(f"🎬 Starting full video processing...")
            print(f"👤 User: {user_id}")
            
            saved_video_path = self.save_video_to_data_folder(video_path, user_id)
            video_info = self.get_video_info(saved_video_path)
            frame_paths = self.extract_frames(saved_video_path, num_frames=6)
            if not frame_paths: raise ValueError("Frame extraction failed")

            openai_result = self.analyze_frames_with_openai(frame_paths, query, video_info)
            if not openai_result.get("success"): raise ValueError(openai_result.get("error"))

            crew_result = self.enhance_analysis_with_crew(openai_result, query, saved_video_path)
            
            processing_time = time.time() - start_time
            total_tokens = openai_result.get('tokens_used', 0) + crew_result.get('tokens_used', 0)

            final_result = {
                'success': True,
                'result': {
                    "primary_analysis": openai_result.get("analysis", ""),
                    "enhanced_response": crew_result.get("enhanced_analysis", "") if crew_result.get("success") else "",
                    "technical_details": {"tokens_used": total_tokens},
                },
                'query': query,
                'processing_method': 'frame_extraction + openai_vision + crewai_enhancement',
                'processing_time': processing_time
            }
            self.store_to_pixeltable(saved_video_path, query, final_result, user_id, processing_time, True)
            print(f"✅ Video processing completed in {processing_time:.2f}s")
            return final_result
            
        except Exception as e:
            processing_time = time.time() - start_time
            error_result = {'success': False, 'error': str(e), 'query': query, 'processing_time': processing_time}
            if saved_video_path: self.store_to_pixeltable(saved_video_path, query, error_result, user_id, processing_time, False)
            return error_result
        finally:
            self.cleanup_frame_dir(frame_paths)
            if original_path != saved_video_path and saved_video_path: self.cleanup_temp_file(original_path)

    def quick_analyze(self, video_path: str, query: str = "", user_id: str = "anonymous") -> Dict[str, Any]:
        """Quick analysis using frame extraction and OpenAI only with database storage."""
        start_time = time.time()
        original_path = video_path
        saved_video_path = None
        frame_paths = []
        try:
            print(f"⚡ Starting quick video analysis...")
            print(f"👤 User: {user_id}")
            
            saved_video_path = self.save_video_to_data_folder(video_path, user_id)
            video_info = self.get_video_info(saved_video_path)
            frame_paths = self.extract_frames(saved_video_path, num_frames=3)
            if not frame_paths: raise ValueError("Frame extraction failed")

            openai_result = self.analyze_frames_with_openai(frame_paths, query, video_info)
            if not openai_result.get("success"): raise ValueError(openai_result.get("error"))

            processing_time = time.time() - start_time
            final_result = {
                'success': True,
                'result': {
                    "analysis": openai_result.get("analysis", ""),
                    "technical_details": {
                        "model_used": openai_result.get("model_used", "gpt-4o"),
                        "tokens_used": openai_result.get("tokens_used", 0)
                    }
                },
                'query': query,
                'processing_method': 'frame_extraction + openai_vision_only',
                'processing_time': processing_time
            }
            
            self.store_to_pixeltable(saved_video_path, query, final_result, user_id, processing_time, True)
            print(f"⚡ Quick video analysis completed in {processing_time:.2f}s")
            return final_result
            
        except Exception as e:
            processing_time = time.time() - start_time
            error_result = {'success': False, 'error': str(e), 'query': query, 'processing_time': processing_time}
            if saved_video_path: self.store_to_pixeltable(saved_video_path, query, error_result, user_id, processing_time, False)
            return error_result
        finally:
            self.cleanup_frame_dir(frame_paths)
            if original_path != saved_video_path and saved_video_path: self.cleanup_temp_file(original_path)


if __name__ == "__main__":
    # This requires ffmpeg to be installed and in the system's PATH
    dummy_video_path = "/tmp/test_video.mp4"
    try:
        # Create a dummy video file for testing
        subprocess.run(
            ['ffmpeg', '-f', 'lavfi', '-i', 'testsrc=duration=5:size=320x240:rate=10', 
             '-pix_fmt', 'yuv420p', '-y', dummy_video_path], 
            check=True, capture_output=True
        )
        print(f"✅ Created a dummy test video at: {dummy_video_path}")
        
        agent = VideoAgent()

        print("\n" + "="*20 + " TESTING QUICK ANALYSIS " + "="*20)
        agent.quick_analyze(
            video_path=dummy_video_path,
            query="What is this test video showing?",
            user_id="video_user_123"
        )
        
        print("\n" + "="*20 + " TESTING FULL ANALYSIS " + "="*20)
        agent.process_video(
            video_path=dummy_video_path,
            query="Provide a detailed breakdown of the scenes.",
            user_id="video_user_456"
        )

        if PIXELTABLE_AVAILABLE:
            print("\n" + "="*20 + " PULLING DATA FROM PIXELTABLE " + "="*20)
            summary = get_token_usage_summary()
            print("\n--- Overall Token Usage Summary ---")
            print(json.dumps(summary, indent=2))
            
            print("\n--- Video Records for 'video_user_123' ---")
            user_records = get_user_records(user_id="video_user_123", agent_type="video")
            if 'video' in user_records and hasattr(user_records['video'], 'head'):
                 print(user_records['video'].head())
            else:
                 print(user_records)

    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print("\n❌ FFMPEG is not installed or not in the PATH. Cannot run video agent tests.")
        print(f"   Error: {e}")
    finally:
        if os.path.exists(dummy_video_path):
            os.remove(dummy_video_path)
            print(f"🗑️ Cleaned up dummy video file.")
