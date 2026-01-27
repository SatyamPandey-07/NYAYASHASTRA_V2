# 🚀 NyayaShastra - Complete Startup Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Python 3.9+ installed
- ✅ Node.js 18+ installed (for frontend)
- ✅ At least 10GB free RAM
- ✅ Internet connection (for initial model downloads)

---

## 🎯 Complete Startup Sequence

### Step 1: Initial Setup (One-Time)

```bash
# Navigate to backend
cd backend

# Run setup script (installs dependencies, Ollama, models)
./setup_hybrid_rag.sh
```

**What this does:**
- Installs Python dependencies (BGE-M3, Reranker, etc.)
- Checks/installs Ollama
- Downloads Llama-3-8B model (~4.7GB)
- Tests all services

**Time:** 10-15 minutes (includes model download)

---

### Step 2: Ingest Legal Documents (One-Time)

```bash
# Still in backend/ directory
python scripts/ingest_semantic.py
```

**What this does:**
- Converts PDFs to Markdown
- Creates semantic chunks
- Generates BGE-M3 embeddings
- Stores in ChromaDB

**Time:** Varies (depends on number of PDFs)
- ~150 PDFs = 15-20 minutes

**Note:** You only need to run this once, or when you add new PDFs.

---

### Step 3: Start Ollama Server (Required for Every Session)

```bash
# In a new terminal (Terminal 1)
ollama serve
```

**Keep this terminal running!** Ollama needs to stay active for local LLM inference.

**Check it's working:**
```bash
# In another terminal
curl http://localhost:11434/api/tags
```

---

### Step 4: Start FastAPI Backend (Required for Every Session)

```bash
# In a new terminal (Terminal 2)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:** http://localhost:8000

**Check it's working:**
- Open http://localhost:8000/docs (FastAPI Swagger UI)

---

### Step 5: Start Frontend (Required for Every Session)

```bash
# In a new terminal (Terminal 3)
cd NYAYASHASTRA  # root directory
npm install      # Only needed first time
npm run dev
```

**Frontend will be available at:** http://localhost:5173

---

## 📋 Quick Reference: Daily Startup

**After initial setup, this is all you need to do each time:**

```bash
# Terminal 1 (Ollama)
ollama serve

# Terminal 2 (Backend)
cd backend
uvicorn app.main:app --reload

# Terminal 3 (Frontend)
npm run dev
```

Then open: http://localhost:5173

---

## 🧪 Test the Hybrid RAG Pipeline (Before Full Startup)

```bash
cd backend
python test_hybrid_rag.py
```

This tests:
- ✅ BGE-M3 embeddings
- ✅ BGE-Reranker
- ✅ Semantic chunking
- ✅ Ollama connection
- ✅ Hybrid search
- ✅ Full pipeline

**Expected output:** All tests should pass (6/6)

---

## 🔍 Verify Services Are Running

### Check Ollama:
```bash
curl http://localhost:11434/api/tags
```
**Expected:** JSON response with available models

### Check Backend:
```bash
curl http://localhost:8000/health
```
**Expected:** `{"status": "healthy"}`

### Check Frontend:
Open browser: http://localhost:5173
**Expected:** NyayaShastra landing page

---

## 🛠️ Troubleshooting

### "Ollama not found"
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start it
ollama serve

# Download model
ollama pull llama3:8b-instruct-q4_K_M
```

### "No documents found" in queries
```bash
# You need to ingest documents first
cd backend
python scripts/ingest_semantic.py
```

### "ModuleNotFoundError"
```bash
# Reinstall dependencies
cd backend
pip install -r requirements.txt
```

### Backend crashes with "Out of memory"
- Close other applications
- You need ~10GB free RAM
- Check: `free -h` (Linux) or Activity Monitor (Mac)

---

## 🎯 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      YOUR SYSTEM                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [Terminal 1]          [Terminal 2]          [Terminal 3]    │
│  Ollama Server         FastAPI Backend       React Frontend  │
│  :11434                :8000                 :5173           │
│       │                     │                     │          │
│       │                     ▼                     │          │
│       │            ┌─────────────────┐            │          │
│       │            │ Hybrid RAG      │            │          │
│       │            │ Pipeline        │            │          │
│       │            │                 │            │          │
│       │            │ - BGE-M3        │            │          │
│       │            │ - BM25          │            │          │
│       │            │ - Reranker      │            │          │
│       │            └────────┬────────┘            │          │
│       │                     │                     │          │
│       └─────── Generates ───┘                     │          │
│                Answer                             │          │
│                     │                             │          │
│                     └──────── Displays ───────────┘          │
│                                                               │
│  [ChromaDB]                                                   │
│  Stores semantic embeddings of legal documents               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📂 What Gets Created/Updated

After setup and ingestion:

```
NYAYASHASTRA/
├── backend/
│   ├── chroma_db/
│   │   └── legal_documents_semantic/   # ← Your indexed documents
│   ├── app/services/
│   │   └── [All new services]          # ← Hybrid RAG components
│   └── [Other files]
├── node_modules/                       # ← Frontend dependencies
└── [Other files]
```

---

## 💡 Usage Examples

### Ask a Legal Question:

1. Open http://localhost:5173
2. Type: "What is the punishment for murder under IPC?"
3. See the system:
   - Search with hybrid retrieval (Vector + BM25)
   - Re-rank results
   - Generate answer with local Llama-3-8B
   - Display answer with citations

### Command Line Test:

```python
# Quick test script
import asyncio
from app.services.enhanced_retriever_service import get_enhanced_retriever_service
from app.services.ollama_service import get_ollama_service

async def test():
    retriever = await get_enhanced_retriever_service()
    ollama = await get_ollama_service()
    
    query = "What is IPC Section 302?"
    result = await retriever.retrieve(query, n_results=5)
    answer = await ollama.generate_with_context(query, result.documents)
    
    print(f"Question: {query}")
    print(f"Answer: {answer}")

asyncio.run(test())
```

---

## 🎉 Summary

**One-time setup:**
1. `cd backend && ./setup_hybrid_rag.sh`
2. `python scripts/ingest_semantic.py`

**Every time you start:**
1. Terminal 1: `ollama serve`
2. Terminal 2: `cd backend && uvicorn app.main:app --reload`
3. Terminal 3: `npm run dev`
4. Open: http://localhost:5173

**That's it!** You now have a fully local, hybrid RAG-powered legal AI assistant.

---

## 📞 Need Help?

- **Setup issues**: Check [backend/HYBRID_RAG_QUICKSTART.md](backend/HYBRID_RAG_QUICKSTART.md)
- **Architecture**: See [docs/HYBRID_RAG_ARCHITECTURE.md](docs/HYBRID_RAG_ARCHITECTURE.md)
- **Component tests**: Run `python test_hybrid_rag.py`
- **Visual guide**: Run `python visualize_pipeline.py`
