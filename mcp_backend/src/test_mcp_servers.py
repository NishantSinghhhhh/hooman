#!/usr/bin/env python3
"""
Test script to check if MCP server files can be imported and run
"""
import os
import sys
import subprocess

def test_file_syntax(file_path):
    """Test if a Python file has valid syntax."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check if file is empty
        if not content.strip():
            return False, "File is empty"
        
        # Try to compile the file
        compile(content, file_path, 'exec')
        return True, "Syntax OK"
    
    except SyntaxError as e:
        return False, f"Syntax Error: {e}"
    except Exception as e:
        return False, f"Error: {e}"

def test_server_execution(file_path):
    """Test if a server file can be executed."""
    try:
        # Try to run the file with a timeout
        result = subprocess.run(
            [sys.executable, file_path],
            capture_output=True,
            text=True,
            timeout=5,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode == 0:
            return True, "Execution OK"
        else:
            return False, f"Exit code {result.returncode}: {result.stderr}"
    
    except subprocess.TimeoutExpired:
        return True, "Running (timeout after 5s - normal for servers)"
    except Exception as e:
        return False, f"Execution error: {e}"

def main():
    print("🧪 Testing MCP Server Files")
    print("=" * 50)
    
    mcp_servers = [
        "src/server/audio_mcp_server.py",
        "src/server/video_mcp_server.py", 
        "src/server/image_mcp_server.py",
        "src/server/docs_mcp_server.py"
    ]
    
    for server_file in mcp_servers:
        print(f"\n📋 Testing {server_file}")
        print("-" * 30)
        
        # Check if file exists
        if not os.path.exists(server_file):
            print(f"❌ File does not exist: {server_file}")
            continue
        
        # Check file size
        file_size = os.path.getsize(server_file)
        print(f"📏 File size: {file_size} bytes")
        
        if file_size == 0:
            print("❌ File is empty!")
            continue
        
        # Test syntax
        syntax_ok, syntax_msg = test_file_syntax(server_file)
        if syntax_ok:
            print(f"✅ Syntax: {syntax_msg}")
        else:
            print(f"❌ Syntax: {syntax_msg}")
            continue
        
        # Show first few lines
        try:
            with open(server_file, 'r') as f:
                lines = f.readlines()[:5]
            print("📖 First 5 lines:")
            for i, line in enumerate(lines, 1):
                print(f"   {i}: {line.rstrip()}")
        except Exception as e:
            print(f"❌ Could not read file: {e}")
        
        # Test execution
        exec_ok, exec_msg = test_server_execution(server_file)
        if exec_ok:
            print(f"✅ Execution: {exec_msg}")
        else:
            print(f"❌ Execution: {exec_msg}")
    
    print("\n" + "=" * 50)
    print("🏁 Testing complete!")

if __name__ == "__main__":
    main()