# import os
# import yaml
# from pathlib import Path
# from typing import Dict, Any, Optional

# from crewai import Agent, Task, Crew, Process
# from crewai.project import CrewBase, agent, crew, task
# from crewai_tools import MCPAdapter  # or MCPServerAdapter depending on your version

# from pixeltable_mcp_service import PixeltableMCPService

# # MCP backend configuration - adjust URLs with env variables or static URLs
# server_configs = [
#     {"url": os.getenv("AUDIO_MCP_URL", "http://localhost:8080/sse"), "transport": "sse"},
#     {"url": os.getenv("VIDEO_MCP_URL", "http://localhost:8081/sse"), "transport": "sse"},
#     {"url": os.getenv("IMAGE_MCP_URL", "http://localhost:8082/sse"), "transport": "sse"},
#     {"url": os.getenv("DOCS_MCP_URL", "http://localhost:8083/sse"), "transport": "sse"},
# ]

# # Initialize MCPAdapter once at module level, reused in all agents
# try:
#     mcp_tools = MCPAdapter(server_configs)
#     print("✅ MCP Tools initialized successfully")
# except Exception as e:
#     print(f"⚠️ MCP Tools initialization failed: {str(e)}")
#     mcp_tools = None

# # Initialize Pixeltable MCP Service
# try:
#     pixeltable_service = PixeltableMCPService()
#     print("✅ Pixeltable MCP Service initialized successfully")
# except Exception as e:
#     print(f"⚠️ Pixeltable service initialization failed: {str(e)}")
#     pixeltable_service = None

# @CrewBase
# class MultimodalMCPCrew:
#     """Enhanced multimodal crew with MCP backend and Pixeltable integration."""
    
#     agents_config = 'config/agents.yaml'
#     tasks_config = 'config/tasks.yaml'
    
#     def __init__(self):
#         # Load configurations
#         self.agents_config_data = self._load_config(self.agents_config)
#         self.tasks_config_data = self._load_config(self.tasks_config)
        
#         # Media type to MCP URL mapping
#         self.mcp_urls = {
#             'audio': os.getenv("AUDIO_MCP_URL", "http://localhost:8080/sse"),
#             'video': os.getenv("VIDEO_MCP_URL", "http://localhost:8081/sse"),
#             'image': os.getenv("IMAGE_MCP_URL", "http://localhost:8082/sse"),
#             'docs': os.getenv("DOCS_MCP_URL", "http://localhost:8083/sse")
#         }
        
#         print("✅ MultimodalMCPCrew initialized successfully")

#     def _load_config(self, config_path: str) -> Dict[str, Any]:
#         """Load YAML configuration file."""
#         full_path = os.path.join(os.path.dirname(__file__), config_path)
#         try:
#             with open(full_path, 'r') as file:
#                 return yaml.safe_load(file)
#         except FileNotFoundError:
#             print(f"⚠️ Config file not found: {config_path}, using defaults")
#             return self._get_default_config(config_path)

