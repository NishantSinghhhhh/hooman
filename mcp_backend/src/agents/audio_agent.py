import os
import time
import uuid
import shutil
import json
from typing import Dict, Any, Optional
from crewai import Agent, Task, Crew
import openai
from pathlib import Path
import subprocess

# Import the Pixeltable insert and query functions
try:
    from src.ingestor.ingestor import (
        insert_audio_record,
        insert_tracking_record,
        get_user_records,
        get_token_usage_summary
    )
    PIXELTABLE_AVAILABLE = True
    print("✅ Pixeltable integration loaded for AudioAgent")
except ImportError:
    print("⚠️ Pixeltable integration not available - continuing without database storage")
    PIXELTABLE_AVAILABLE = False

class AudioAgent:
    """Specialized agent for audio processing and analysis."""
    
    def __init__(self):
        """Initialize the Audio Agent with OpenAI client."""
        self.openai_client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        # Create data directory if it doesn't exist
        self.data_dir = os.path.join(os.getcwd(), "data", "audio")
        os.makedirs(self.data_dir, exist_ok=True)
        print(f"📁 Data directory for audio: {self.data_dir}")
        print("✅ AudioAgent initialized with OpenAI integration")

    def save_audio_to_data_folder(self, source_path: str, user_id: str = "anonymous") -> str:
        """Saves the audio file to the data folder with a unique name."""
        try:
            original_filename = os.path.basename(source_path)
            name, ext = os.path.splitext(original_filename)
            timestamp = int(time.time())
            unique_id = str(uuid.uuid4())[:8]
            new_filename = f"{user_id}_{timestamp}_{unique_id}_{name}{ext}"
            new_path = os.path.join(self.data_dir, new_filename)
            shutil.copy2(source_path, new_path)
            print(f"💾 Audio saved to data folder: {new_filename}")
            return new_path
        except Exception as e:
            print(f"❌ Error saving audio to data folder: {str(e)}")
            return source_path

    def cleanup_temp_file(self, file_path: str) -> None:
        """Cleans up a temporary file if it's not in the data folder."""
        try:
            if not file_path.startswith(self.data_dir) and os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️ Cleaned up temporary file: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"⚠️ Could not clean up temporary file: {str(e)}")

    def get_audio_info(self, audio_path: str) -> Dict[str, Any]:
        """Get basic information about the audio file."""
        try:
            file_info = {
                "filename": os.path.basename(audio_path),
                "format": Path(audio_path).suffix.lower(),
                "file_size_bytes": os.path.getsize(audio_path)
            }
            try:
                import mutagen
                audio_file = mutagen.File(audio_path)
                if audio_file:
                    file_info["duration"] = audio_file.info.length
                    file_info["bitrate"] = getattr(audio_file.info, 'bitrate', None)
                    file_info["sample_rate"] = getattr(audio_file.info, 'sample_rate', None)
                    file_info["channels"] = getattr(audio_file.info, 'channels', None)
            except ImportError:
                print("📝 Note: Install mutagen for detailed audio metadata (pip install mutagen)")
            except Exception:
                pass # Ignore if metadata extraction fails
            return file_info
        except Exception as e:
            return {"error": str(e)}

    def transcribe_audio_with_openai(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio using OpenAI Whisper API."""
        try:
            print(f"🎵 Transcribing audio with OpenAI Whisper...")
            with open(audio_path, "rb") as audio_file:
                transcript = self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json"
                )
            return {
                "success": True, "transcript": transcript.text, "language": transcript.language,
                "duration": transcript.duration, "segments": transcript.segments
            }
        except Exception as e:
            return {"success": False, "error": f"Audio transcription failed: {str(e)}"}

    def analyze_audio_with_openai(self, transcript_data: Dict[str, Any], query: str, audio_info: Dict) -> Dict[str, Any]:
        """Analyze transcribed audio content using OpenAI."""
        try:
            print(f"🔍 Analyzing audio content with OpenAI...")
            transcript_text = transcript_data.get("transcript", "")
            if not transcript_text:
                return {"success": False, "error": "No transcript available for analysis"}

            prompt = query or "Provide a comprehensive analysis of the following audio transcript."
            full_prompt = f"User Query: {prompt}\n\nTranscript:\n{transcript_text}"
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert audio content analyst."},
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=1500, temperature=0.3
            )
            analysis = response.choices[0].message.content
            return {
                "success": True, "analysis": analysis, "model_used": "gpt-4o",
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "transcript_stats": {
                    "word_count": len(transcript_text.split()),
                    "character_count": len(transcript_text),
                    "language": transcript_data.get('language', 'unknown'),
                    "duration": transcript_data.get('duration')
                }
            }
        except Exception as e:
            return {"success": False, "error": f"OpenAI audio analysis error: {str(e)}"}

    def create_audio_analysis_agent(self) -> Agent:
        """Create a specialized audio analysis agent."""
        return Agent(
            role='Senior Audio Content Analysis Expert',
            goal='Provide comprehensive and accurate analysis of audio content and transcripts',
            backstory='An expert in speech analysis and conversation understanding, you excel at identifying key themes and speaker intent.',
            verbose=True, allow_delegation=False
        )

    def create_content_synthesizer_agent(self) -> Agent:
        """Create an agent to synthesize and format the final response."""
        return Agent(
            role='Audio Content Synthesis Specialist',
            goal='Transform audio analysis into user-friendly, comprehensive responses',
            backstory='A specialist in transforming complex audio analysis into clear, engaging, and well-structured responses.',
            verbose=True, allow_delegation=False
        )

    def enhance_analysis_with_crew(self, openai_analysis: Dict[str, Any], query: str, audio_path: str, transcript_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance the OpenAI analysis using CrewAI agents."""
        try:
            print("🤖 Enhancing audio analysis with CrewAI agents...")
            analysis_agent = self.create_audio_analysis_agent()
            synthesizer_agent = self.create_content_synthesizer_agent()
            
            enhancement_task = Task(
                description=f"Enhance this analysis: {openai_analysis.get('analysis', '')}\nBased on this transcript: {transcript_data.get('transcript', '')[:500]}...\nAnd user query: {query}",
                expected_output="An enhanced analysis with deeper insights.", agent=analysis_agent
            )
            synthesis_task = Task(
                description="Synthesize the enhanced analysis into a final user-facing response.",
                expected_output="A comprehensive, well-structured response.", agent=synthesizer_agent, context=[enhancement_task]
            )
            crew = Crew(agents=[analysis_agent, synthesizer_agent], tasks=[enhancement_task, synthesis_task], verbose=True)
            result = crew.kickoff()
            
            return {
                "success": True, "enhanced_analysis": str(result),
                "tokens_used": crew.usage_metrics.total_tokens
            }
        except Exception as e:
            return {"success": False, "error": f"CrewAI enhancement error: {str(e)}"}

    def store_to_pixeltable(self, audio_path: str, query: str, result: Dict[str, Any], user_id: str, processing_time: float, success: bool) -> bool:
        """Stores the audio processing results to Pixeltable."""
        if not PIXELTABLE_AVAILABLE:
            return False
        try:
            print("💾 Storing audio results to Pixeltable database...")
            audio_info = self.get_audio_info(audio_path)
            res_data = result.get('result', {})
            tech_details = res_data.get('technical_details', {})
            tokens_used = tech_details.get('tokens_used', 0)

            if success:
                crewai_result = {"primary_analysis": res_data.get('analysis', ''), "enhanced_response": res_data.get('enhanced_response', '')}
                insert_audio_record(
                    user_id=user_id, audio_path=audio_path,
                    duration=audio_info.get('duration', 0),
                    sample_rate=audio_info.get('sample_rate', 0),
                    channels=audio_info.get('channels', 0),
                    format=audio_info.get('format', '').replace('.', ''),
                    query=query, crewai_result=crewai_result, tokens_used=int(tokens_used),
                    context=f"Audio analysis - {result.get('processing_method', 'unknown')}",
                    metadata=audio_info
                )
            
            insert_tracking_record(
                user_id=user_id, agent_type='audio', table_name='demo.audio',
                record_id=f"aud_{int(time.time())}", query=query, tokens_used=int(tokens_used),
                processing_time=processing_time, success=success, error_message=result.get('error')
            )
            print("✅ Database storage completed successfully.")
            return True
        except Exception as e:
            print(f"❌ Database storage error: {str(e)}")
            return False

    def process_audio(self, audio_path: str, query: str = "", user_id: str = "anonymous") -> Dict[str, Any]:
        """Main method to process an audio file with query and store results."""
        start_time = time.time()
        original_path = audio_path
        saved_audio_path = None
        try:
            print(f"🎵 Starting full audio processing...")
            saved_audio_path = self.save_audio_to_data_folder(audio_path, user_id)
            audio_info = self.get_audio_info(saved_audio_path)
            
            transcript_result = self.transcribe_audio_with_openai(saved_audio_path)
            if not transcript_result.get("success"): raise ValueError(transcript_result.get("error"))
            
            openai_result = self.analyze_audio_with_openai(transcript_result, query, audio_info)
            if not openai_result.get("success"): raise ValueError(openai_result.get("error"))
            
            crew_result = self.enhance_analysis_with_crew(openai_result, query, saved_audio_path, transcript_result)
            
            processing_time = time.time() - start_time
            total_tokens = openai_result.get('tokens_used', 0) + crew_result.get('tokens_used', 0)

            final_result = {
                'success': True,
                'result': {
                    "transcript": transcript_result.get("transcript", ""),
                    "primary_analysis": openai_result.get("analysis", ""),
                    "enhanced_response": crew_result.get("enhanced_analysis", "") if crew_result.get("success") else "",
                    "technical_details": {"tokens_used": total_tokens},
                },
                'query': query, 'processing_method': 'whisper + openai + crewai', 'processing_time': processing_time
            }
            self.store_to_pixeltable(saved_audio_path, query, final_result, user_id, processing_time, True)
            return final_result
        except Exception as e:
            processing_time = time.time() - start_time
            error_result = {'success': False, 'error': str(e), 'query': query, 'processing_time': processing_time}
            if saved_audio_path: self.store_to_pixeltable(saved_audio_path, query, error_result, user_id, processing_time, False)
            return error_result
        finally:
            if original_path != saved_audio_path and saved_audio_path: self.cleanup_temp_file(original_path)

    def quick_analyze(self, audio_path: str, query: str = "", user_id: str = "anonymous") -> Dict[str, Any]:
        """Quick analysis using OpenAI transcription and analysis only."""
        start_time = time.time()
        original_path = audio_path
        saved_audio_path = None
        try:
            print(f"⚡ Starting quick audio analysis...")
            saved_audio_path = self.save_audio_to_data_folder(audio_path, user_id)
            audio_info = self.get_audio_info(saved_audio_path)

            transcript_result = self.transcribe_audio_with_openai(saved_audio_path)
            if not transcript_result.get("success"): raise ValueError(transcript_result.get("error"))
            
            openai_result = self.analyze_audio_with_openai(transcript_result, query, audio_info)
            if not openai_result.get("success"): raise ValueError(openai_result.get("error"))
            
            processing_time = time.time() - start_time
            final_result = {
                'success': True,
                'result': {
                    "transcript": transcript_result.get("transcript", ""),
                    "analysis": openai_result.get("analysis", ""),
                    "technical_details": {"tokens_used": openai_result.get("tokens_used", 0)},
                },
                'query': query, 'processing_method': 'whisper + openai_only', 'processing_time': processing_time
            }
            self.store_to_pixeltable(saved_audio_path, query, final_result, user_id, processing_time, True)
            return final_result
        except Exception as e:
            processing_time = time.time() - start_time
            error_result = {'success': False, 'error': str(e), 'query': query, 'processing_time': processing_time}
            if saved_audio_path: self.store_to_pixeltable(saved_audio_path, query, error_result, user_id, processing_time, False)
            return error_result
        finally:
            if original_path != saved_audio_path and saved_audio_path: self.cleanup_temp_file(original_path)

if __name__ == "__main__":
    # Requires ffmpeg and mutagen to be installed
    dummy_audio_path = "/tmp/test_audio.mp3"
    try:
        # Create a dummy silent audio file for testing
        subprocess.run(
            ['ffmpeg', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '5', 
             '-q:a', '9', '-acodec', 'libmp3lame', '-y', dummy_audio_path], 
            check=True, capture_output=True
        )
        print(f"✅ Created a dummy test audio file at: {dummy_audio_path}")
        
        agent = AudioAgent()

        print("\n" + "="*20 + " TESTING QUICK ANALYSIS " + "="*20)
        agent.quick_analyze(
            audio_path=dummy_audio_path,
            query="This is a silent audio file. Please confirm you received it.",
            user_id="audio_user_123"
        )
        
        print("\n" + "="*20 + " TESTING FULL ANALYSIS " + "="*20)
        agent.process_audio(
            audio_path=dummy_audio_path,
            query="Analyze this silent audio and describe what you find.",
            user_id="audio_user_456"
        )

        if PIXELTABLE_AVAILABLE:
            print("\n" + "="*20 + " PULLING DATA FROM PIXELTABLE " + "="*20)
            summary = get_token_usage_summary()
            print("\n--- Overall Token Usage Summary ---")
            print(json.dumps(summary, indent=2))
            
            print("\n--- Audio Records for 'audio_user_123' ---")
            user_records = get_user_records(user_id="audio_user_123", agent_type="audio")
            if 'audio' in user_records and hasattr(user_records['audio'], 'head'):
                 print(user_records['audio'].head())
            else:
                 print(user_records)

    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print("\n❌ FFMPEG is not installed or not in the PATH. Cannot run audio agent tests.")
        print(f"   Error: {e}")
    finally:
        if os.path.exists(dummy_audio_path):
            os.remove(dummy_audio_path)
            print(f"🗑️ Cleaned up dummy audio file.")
