"""
MCP Backend Crew - CrewAI orchestration and coordination
"""

import os
from typing import Dict, List, Any, Optional
from crewai import Agent, Task, Crew, Process
from crewai.project import CrewBase, agent, crew, task
from crewai_tools import MCPServerAdapter
from langchain_community.llms import Ollama

# Import custom tools
from .tools.custom_tool import CustomSearchTool

@CrewBase
class McpBackendCrew():
    """MCP Backend crew for multimodal AI processing"""
    
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'
    
    def __init__(self):
        self.llm = self._setup_llm()
        self.mcp_tools = self._setup_mcp_servers()
        self.custom_tools = [CustomSearchTool()]
    
    def _setup_llm(self):
        """Setup the language model"""
        if os.getenv('USE_OLLAMA', 'true').lower() == 'true':
            return Ollama(
                model=os.getenv('OLLAMA_MODEL', 'llama3.2:3b'),
                base_url=os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434'),
                temperature=float(os.getenv('LLM_TEMPERATURE', '0.3'))
            )
        else:
            # Fallback to OpenAI if Ollama not available
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model="gpt-4",
                temperature=0.3,
                api_key=os.getenv('OPENAI_API_KEY')
            )
    
    def _setup_mcp_servers(self):
        """Setup MCP server connections"""
        try:
            server_configurations = [
                {
                    "name": "audio_server",
                    "url": os.getenv("AUDIO_MCP_URL", "http://localhost:8080/sse"),
                    "transport": "sse"
                },
                {
                    "name": "video_server", 
                    "url": os.getenv("VIDEO_MCP_URL", "http://localhost:8081/sse"),
                    "transport": "sse"
                },
                {
                    "name": "image_server",
                    "url": os.getenv("IMAGE_MCP_URL", "http://localhost:8082/sse"),
                    "transport": "sse"
                },
                {
                    "name": "docs_server",
                    "url": os.getenv("DOCS_MCP_URL", "http://localhost:8083/sse"),
                    "transport": "sse"
                }
            ]
            
            mcp_adapter = MCPServerAdapter(server_configurations)
            print("✅ MCP servers configured successfully")
            return mcp_adapter
            
        except Exception as e:
            print(f"⚠️ MCP server setup failed: {e}")
            return None

    @agent
    def router_agent(self) -> Agent:
        """Router agent for query classification"""
        return Agent(
            config=self.agents_config['router_agent'],
            llm=self.llm,
            tools=self.custom_tools,
            verbose=True
        )

    @agent
    def document_agent(self) -> Agent:
        """Document processing specialist"""
        tools = self.custom_tools.copy()
        if self.mcp_tools:
            tools.extend(self.mcp_tools.get_tools(['docs_server']))
        
        return Agent(
            config=self.agents_config['document_agent'],
            llm=self.llm,
            tools=tools,
            verbose=True
        )

    @agent
    def image_agent(self) -> Agent:
        """Image processing specialist"""
        tools = self.custom_tools.copy()
        if self.mcp_tools:
            tools.extend(self.mcp_tools.get_tools(['image_server']))
        
        return Agent(
            config=self.agents_config['image_agent'],
            llm=self.llm,
            tools=tools,
            verbose=True
        )

    @agent
    def audio_agent(self) -> Agent:
        """Audio processing specialist"""
        tools = self.custom_tools.copy()
        if self.mcp_tools:
            tools.extend(self.mcp_tools.get_tools(['audio_server']))
        
        return Agent(
            config=self.agents_config['audio_agent'],
            llm=self.llm,
            tools=tools,
            verbose=True
        )

    @agent
    def video_agent(self) -> Agent:
        """Video processing specialist"""
        tools = self.custom_tools.copy()
        if self.mcp_tools:
            tools.extend(self.mcp_tools.get_tools(['video_server']))
        
        return Agent(
            config=self.agents_config['video_agent'],
            llm=self.llm,
            tools=tools,
            verbose=True
        )

    @agent
    def synthesis_agent(self) -> Agent:
        """Result synthesis specialist"""
        return Agent(
            config=self.agents_config['synthesis_agent'],
            llm=self.llm,
            tools=self.custom_tools,
            verbose=True
        )

    @task
    def routing_task(self) -> Task:
        """Task for query routing and classification"""
        return Task(
            config=self.tasks_config['routing_task'],
            agent=self.router_agent()
        )

    @task
    def document_processing_task(self) -> Task:
        """Task for document processing"""
        return Task(
            config=self.tasks_config['document_processing_task'],
            agent=self.document_agent()
        )

    @task
    def image_processing_task(self) -> Task:
        """Task for image processing"""
        return Task(
            config=self.tasks_config['image_processing_task'],
            agent=self.image_agent()
        )

    @task
    def audio_processing_task(self) -> Task:
        """Task for audio processing"""
        return Task(
            config=self.tasks_config['audio_processing_task'],
            agent=self.audio_agent()
        )

    @task
    def video_processing_task(self) -> Task:
        """Task for video processing"""
        return Task(
            config=self.tasks_config['video_processing_task'],
            agent=self.video_agent()
        )

    @task
    def synthesis_task(self) -> Task:
        """Task for result synthesis"""
        return Task(
            config=self.tasks_config['synthesis_task'],
            agent=self.synthesis_agent()
        )

    @crew
    def crew(self) -> Crew:
        """Create the main multimodal processing crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True
        )
    
    def process_multimodal_query(self, query_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a multimodal query through the crew
        
        Args:
            query_data: Dictionary containing query information
            
        Returns:
            Dictionary with processing results
        """
        try:
            print(f"🚀 Processing multimodal query...")
            print(f"📝 Content preview: {str(query_data.get('content', ''))[:100]}...")
            print(f"🎯 Media type: {query_data.get('media_type', 'unknown')}")
            
            # Determine which tasks to run based on media type
            media_type = query_data.get('media_type', 'text').lower()
            
            if media_type in ['text', 'document']:
                specialist_task = self.document_processing_task()
                specialist_agent_name = "Document Specialist"
            elif media_type == 'image':
                specialist_task = self.image_processing_task()
                specialist_agent_name = "Image Specialist"
            elif media_type == 'audio':
                specialist_task = self.audio_processing_task()
                specialist_agent_name = "Audio Specialist"
            elif media_type == 'video':
                specialist_task = self.video_processing_task()
                specialist_agent_name = "Video Specialist"
            else:
                specialist_task = self.document_processing_task()
                specialist_agent_name = "Document Specialist (Fallback)"
            
            # Create dynamic crew for this specific query
            dynamic_crew = Crew(
                agents=[
                    self.router_agent(),
                    specialist_task.agent,
                    self.synthesis_agent()
                ],
                tasks=[
                    self.routing_task(),
                    specialist_task,
                    self.synthesis_task()
                ],
                process=Process.sequential,
                verbose=True
            )
            
            # Execute the crew with query data
            inputs = {
                'content': query_data.get('content', ''),
                'media_type': query_data.get('media_type', 'text'),
                'file_count': query_data.get('file_count', 0),
                'user_id': query_data.get('user_id', 'unknown')
            }
            
            result = dynamic_crew.kickoff(inputs=inputs)
            
            return {
                'success': True,
                'result': str(result),
                'agent_used': specialist_agent_name,
                'media_type': media_type,
                'processing_details': {
                    'crew_size': len(dynamic_crew.agents),
                    'tasks_executed': len(dynamic_crew.tasks),
                    'inputs': inputs
                }
            }
            
        except Exception as e:
            print(f"❌ Crew processing failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'result': 'Processing failed due to crew execution error',
                'agent_used': 'Error Handler'
            }
    
    def quick_classify(self, query_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Quick classification without full processing
        
        Args:
            query_data: Dictionary containing query information
            
        Returns:
            Dictionary with classification results
        """
        try:
            print(f"⚡ Quick classification for query...")
            
            # Create minimal crew for classification only
            classification_crew = Crew(
                agents=[self.router_agent()],
                tasks=[self.routing_task()],
                process=Process.sequential,
                verbose=False
            )
            
            inputs = {
                'content': query_data.get('content', ''),
                'media_type': query_data.get('media_type', 'text'),
                'file_count': query_data.get('file_count', 0)
            }
            
            result = classification_crew.kickoff(inputs=inputs)
            
            return {
                'success': True,
                'classification': str(result),
                'inputs': inputs
            }
            
        except Exception as e:
            print(f"❌ Classification failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'classification': 'Classification failed'
            }
    
    def health_check(self) -> Dict[str, Any]:
        """Check crew health and connectivity"""
        health_status = {
            'crew': 'healthy',
            'llm': 'unknown',
            'mcp_servers': 'unknown',
            'agents': len(self.agents) if hasattr(self, 'agents') else 0,
            'tasks': len(self.tasks) if hasattr(self, 'tasks') else 0
        }
        
        try:
            # Test LLM
            if self.llm:
                health_status['llm'] = 'healthy'
            else:
                health_status['llm'] = 'unhealthy'
                
            # Test MCP servers
            if self.mcp_tools:
                health_status['mcp_servers'] = 'connected'
            else:
                health_status['mcp_servers'] = 'disconnected'
                
        except Exception as e:
            health_status['crew'] = 'unhealthy'
            health_status['error'] = str(e)
        
        return health_status