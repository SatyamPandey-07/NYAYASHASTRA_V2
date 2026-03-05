# NyayGuru AI Pro - Backend

🏛️ **AI-Powered Legal Helper for India**

A production-grade, multi-agent RAG system for delivering precise, verifiable, bilingual (English + Hindi) legal answers.

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip or conda

### Installation

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Access the API
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 🚢 Deployment

For production deployment (Docker, Railway, Render, AWS, etc.), see **[DEPLOYMENT.md](../DEPLOYMENT.md)** in the root directory.

**Quick Deploy with Docker:**
```bash
# From project root
docker-compose up -d
```

## 🏗️ Architecture

### Multi-Agent Pipeline

```
User Query
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    AGENT ORCHESTRATOR                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │    Query     │ → Language detection, domain classification │
│  │ Understanding│   Intent extraction, query reformulation   │
│  └──────┬───────┘                                           │
│         ↓                                                    │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Statute    │  │   Case Law   │                         │
│  │  Retrieval   │  │ Intelligence │                         │
│  └──────┬───────┘  └──────┬───────┘                         │
│         ↓                 ↓                                  │
│  ┌──────────────────────────────────┐                       │
│  │       Regulatory Filter          │                       │
│  │   (Jurisdiction, Domain Filter)  │                       │
│  └──────────────┬───────────────────┘                       │
│                 ↓                                            │
│  ┌──────────────────────────────────┐                       │
│  │      Citation & Verification     │                       │
│  │   (Official source validation)   │                       │
│  └──────────────┬───────────────────┘                       │
│                 ↓                                            │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Summarization│  │   Response   │                         │
│  │    Agent     │  │  Synthesis   │                         │
│  └──────────────┘  └──────┬───────┘                         │
│                           ↓                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
              Legal Response with Citations
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings and configuration
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic schemas
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py          # Base agent class
│   │   ├── orchestrator.py  # Agent orchestration
│   │   ├── query_agent.py   # Query understanding
│   │   ├── statute_agent.py # Statute retrieval
│   │   ├── case_agent.py    # Case law intelligence
│   │   ├── regulatory_agent.py # Regulatory filter
│   │   ├── citation_agent.py   # Citation verification
│   │   ├── summarization_agent.py # Document summarization
│   │   └── response_agent.py    # Response synthesis
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── chat.py          # Chat endpoints
│   │   ├── statutes.py      # Statute endpoints
│   │   └── documents.py     # Document upload endpoints
│   └── services/
│       ├── __init__.py
│       ├── vector_store.py  # ChromaDB vector store
│       ├── statute_service.py # Statute data access
│       └── document_service.py # Document processing
├── requirements.txt
├── .env.example
└── README.md
```

## 🔌 API Endpoints

### Chat
- `POST /api/chat/` - Process legal query
- `POST /api/chat/stream` - Stream processing updates (SSE)
- `WS /api/chat/ws/{session_id}` - WebSocket for real-time chat
- `GET /api/chat/agents` - Get agent information

### Statutes
- `GET /api/statutes/` - List all statutes
- `GET /api/statutes/search` - Search statutes
- `GET /api/statutes/section/{section_number}` - Get specific section
- `GET /api/statutes/comparison` - Get IPC-BNS comparisons

### Documents
- `POST /api/documents/upload` - Upload PDF for analysis
- `GET /api/documents/status/{document_id}` - Get processing status
- `DELETE /api/documents/{document_id}` - Delete document

## 🤖 Agents

| Agent | Description |
|-------|-------------|
| **Query Understanding** | Detects language, legal domain, extracts sections |
| **Statute Retrieval** | Retrieves IPC/BNS sections, handles cross-mapping |
| **Case Law Intelligence** | Finds relevant judgments, marks landmark cases |
| **Regulatory Filter** | Filters by jurisdiction and legal category |
| **Citation Agent** | Generates verifiable citations to official sources |
| **Summarization** | Extracts key info from legal documents |
| **Response Synthesis** | Generates comprehensive bilingual responses |

## 🔧 Configuration

Key environment variables:

```env
# Database
DATABASE_URL=sqlite:///./nyayguru.db

# OpenAI (for LLM features)
OPENAI_API_KEY=your_key_here

# Vector Store
CHROMA_PERSIST_DIR=./chroma_db
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 📊 Features

✅ **Multi-Agent RAG System** - 7 specialized agents working in orchestration  
✅ **Bilingual Support** - Full English and Hindi language support  
✅ **IPC ↔ BNS Mapping** - Cross-reference between old and new laws  
✅ **Verified Citations** - Links only to official sources  
✅ **Document Summarization** - Upload and analyze legal PDFs  
✅ **Streaming Updates** - Real-time agent processing status  
✅ **WebSocket Support** - Live chat with streaming responses

## 🚀 Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/nyayguru
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=nyayguru
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 📜 License

MIT License - See LICENSE file for details.

---

⚖️ **Disclaimer**: This software is for informational purposes only and does not constitute legal advice.
