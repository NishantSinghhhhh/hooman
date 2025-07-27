import subprocess
import sys
import time
import os

def run_servers():
    servers = [
        {
            "name": "FastAPI Server",
            "command": ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
            "cwd": os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        },
        {
            "name": "Audio MCP Server",
            "command": ["python", "src/mcp_servers/audio_mcp_server.py"],
            "cwd": os.path.dirname(os.path.abspath(__file__))
        },
        {
            "name": "Video MCP Server", 
            "command": ["python", "src/mcp_servers/video_mcp_server.py"],
            "cwd": os.path.dirname(os.path.abspath(__file__))
        },
        {
            "name": "Image MCP Server",
            "command": ["python", "src/mcp_servers/image_mcp_server.py"], 
            "cwd": os.path.dirname(os.path.abspath(__file__))
        },
        {
            "name": "Docs MCP Server",
            "command": ["python", "src/mcp_servers/docs_mcp_server.py"],
            "cwd": os.path.dirname(os.path.abspath(__file__))
        }
        # Add other MCP servers here
    ]
    
    processes = []
    
    try:
        for server in servers:
            print(f"Starting {server['name']}...")
            process = subprocess.Popen(
                server["command"],
                cwd=server.get("cwd"),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            processes.append((server["name"], process))
            time.sleep(2)  # Give each server time to start
            
        print("\nAll servers started. Press Ctrl+C to stop.")
        
        # Keep the script running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        for name, process in processes:
            print(f"Stopping {name}...")
            process.terminate()
            process.wait()
        print("All servers stopped.")

if __name__ == "__main__":
    run_servers()