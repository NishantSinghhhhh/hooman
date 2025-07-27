# Multimodal AI Assistant

A powerful multimodal AI assistant built with CrewAI and MCP servers that can process text, images, audio, and video content through specialized agents.

## 🚀 Features

- **Multimodal Processing**: Handle text, image, audio, and video inputs
- **Intelligent Routing**: Automatically classify and route queries to appropriate specialist agents
- **MCP Integration**: Leverages Pixeltable MCP servers for advanced processing
- **RESTful API**: Clean FastAPI backend with comprehensive endpoints
- **Agent Orchestration**: Uses CrewAI for coordinated multi-agent workflows

## 🏗️ Architecture

```
User Query → Router Agent → Specialist Agent → MCP Server → Synthesis Agent → Response
```

### Agents
- **Router Agent**: Classifies queries and routes to appropriate specialists
- **Document Agent**: Processes text documents and PDFs
- **Image Agent**: Analyzes images and visual content
- **Video Agent**: Processes video files and temporal content
- **Audio Agent**: Handles audio transcription and analysis
- **Synthesis Agent**: Combines results into user-friendly responses

## 📦 Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd my_project
```

2. **Install dependencies**
```bash
pip install poetry
poetry install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys and MCP server URLs
```

4. **Configure MCP servers**
Ensure your Pixeltable MCP servers are running on:
- Audio: `http://localhost:8080/sse`
- Video: `http://localhost:8081/sse`
- Image: `http://localhost:8082/sse`
- Documents: `http://localhost:8083/sse`

## 🚀 Usage

### Start the API Server

```bash
poetry run python -m src.my_project.main
```

The API will be available at `http://localhost:8000`

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Process Text Query
```bash
POST /process-text
Content-Type: application/json

{
  "query": "What is machine learning?",
  "user_id": "optional-user-id"
}
```

#### Process Multimodal Query
```bash
POST /process-multimodal
Content-Type: multipart/form-data

query: "Analyze this image"
file: [uploaded file]
user_id: "optional-user-id"
```

#### Classify Query
```bash
POST /classify
Content-Type: multipart/form-data

query: "What's in this image?"
file: [optional uploaded file]
```

## 📁 Project Structure

```
my_project/
├── .env                          # Environment variables
├── .gitignore                   # Git ignore file
├── pyproject.toml              # Poetry dependencies
├── README.md                   # This file
├── knowledge/                  # Knowledge base (optional)
└── src/
    └── my_project/
        ├── __init__.py         # Package initialization
        ├── main.py             # FastAPI application
        ├── crew.py             # CrewAI setup and orchestration
        ├── tools/
        │   ├── __init__.py     # Tools package init
        │   └── custom_tool.py  # MCP integration tools
        └── config/
            ├── agents.yaml     # Agent configurations
            └── tasks.yaml      # Task definitions
```

## 🔧 Configuration

### Environment Variables

```bash
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
OLLAMA_BASE_URL=http://localhost:11434

# MCP Server URLs
AUDIO_MCP_URL=http://localhost:8080/sse
VIDEO_MCP_URL=http://localhost:8081/sse
IMAGE_MCP_URL=http://localhost:8082/sse
DOCS_MCP_URL=http://localhost:8083/sse

# FastAPI Settings
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

### Supported File Types

- **Documents**: `.txt`, `.pdf`, `.doc`, `.docx`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`
- **Audio**: `.mp3`, `.wav`
- **Video**: `.mp4`, `.avi`, `.mov`

## 🧪 Testing

Test the API endpoints using curl or your preferred HTTP client:

```bash
# Test health check
curl http://localhost:8000/health

# Test text processing
curl -X POST http://localhost:8000/process-text \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain quantum computing"}'

# Test multimodal processing
curl -X POST http://localhost:8000/process-multimodal \
  -F "query=Describe this image" \
  -F "file=@path/to/your/image.jpg"
```

## 📚 Development

### Adding New Agents

1. Define the agent in `config/agents.yaml`
2. Add corresponding tasks in `config/tasks.yaml`
3. Implement the agent method in `crew.py`
4. Add task method in `crew.py`
5. Update the crew configuration

### Custom Tools

Create new tools in `tools/` directory following the pattern in `custom_tool.py`:

```python
from crewai_tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field

class YourCustomTool(BaseTool):
    name: str = "Your Tool Name"
    description: str = "Tool description"
    
    def _run(self, **kwargs) -> str:
        # Implementation
        pass
```

## 🚀 Deployment

For production deployment:

1. Set `DEBUG=False` in environment
2. Configure proper CORS origins
3. Use a production WSGI server like Gunicorn
4. Set up proper logging
5. Configure MCP servers for production URLs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **MCP Server Connection Failed**: Ensure your MCP servers are running and accessible
2. **File Upload Issues**: Check file size limits and supported formats
3. **Agent Processing Errors**: Verify your OpenAI API key is valid
4. **Import Errors**: Ensure all dependencies are installed with `poetry install`

### Getting Help

- Check the API documentation at `http://localhost:8000/docs`
- Review agent configurations in `config/` files
- Enable debug mode for detailed logs
- Check MCP server logs for processing issues