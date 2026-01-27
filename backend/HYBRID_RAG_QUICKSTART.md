# 🚀 NyayaShastra - Local Hybrid RAG Pipeline Setup Guide

## Quick Start (3 Steps)

### 1️⃣ Install Dependencies

```bash
cd backend
./setup_hybrid_rag.sh
```

This will:
- Install Python packages (BGE-M3, Reranker, etc.)
- Check/install Ollama
- Download Llama-3-8B model
- Test all services

### 2️⃣ Ingest Your Documents

```bash
python scripts/ingest_semantic.py
```

This converts your PDFs to semantic chunks with BGE-M3 embeddings.

### 3️⃣ Test the Pipeline

```bash
python test_hybrid_rag.py
```

This runs comprehensive tests of all components.

---

## What Just Got Upgraded?

### Before (Old System)
```
User Query 
  → Fixed-size chunks (800 chars)
  → Sentence-Transformers embeddings
  → Vector search only
  → Cloud LLM (OpenAI/Groq)
  → ❌ Hallucinations, rate limits, latency
```

### After (New System)
```
User Query
  → Semantic chunks (meaning-based)
  → BGE-M3 embeddings (multi-lingual, 8k context)
  → Hybrid search (Vector + BM25)
  → BGE-Reranker (filters bad contexts)
  → Local Ollama (Llama-3-8B)
  → ✅ No hallucinations, no limits, consistent performance
```

---

## Component Overview

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Chunking** | Split docs intelligently | Semantic + Section-aware |
| **Embeddings** | Dense vectors | BGE-M3 (BAAI) |
| **Keyword Search** | Sparse retrieval | BM25 |
| **Re-ranking** | Quality filter | BGE-Reranker-v2-m3 |
| **LLM** | Answer generation | Llama-3-8B via Ollama |
| **Storage** | Vector DB | ChromaDB |

---

## File Structure

```
backend/
├── app/
│   └── services/
│       ├── embedding_service.py        # BGE-M3 embeddings
│       ├── reranker_service.py         # BGE-Reranker
│       ├── chunking_service.py         # Semantic chunking
│       ├── hybrid_search_service.py    # Vector + BM25
│       ├── ollama_service.py           # Local LLM
│       └── enhanced_retriever_service.py  # Full pipeline
├── scripts/
│   └── ingest_semantic.py              # PDF → ChromaDB
├── setup_hybrid_rag.sh                 # One-click setup
├── test_hybrid_rag.py                  # Component tests
└── requirements.txt                     # Updated dependencies
```

---

## Usage Examples

### Example 1: Simple Search

```python
from app.services.hybrid_search_service import get_hybrid_search_service

service = get_hybrid_search_service()

results = service.hybrid_search(
    query="What is the punishment for murder?",
    n_results=5
)

for doc in results:
    print(f"Score: {doc['rerank_score']:.4f}")
    print(f"Content: {doc['content'][:100]}...")
```

### Example 2: Full RAG Pipeline

```python
import asyncio
from app.services.enhanced_retriever_service import get_enhanced_retriever_service
from app.services.ollama_service import get_ollama_service

async def answer_question(query):
    retriever = await get_enhanced_retriever_service()
    ollama = await get_ollama_service()
    
    # Retrieve contexts
    result = await retriever.retrieve(query, n_results=5)
    
    # Generate answer
    answer = await ollama.generate_with_context(
        query=query,
        contexts=result.documents
    )
    
    return answer

asyncio.run(answer_question("What is IPC Section 302?"))
```

### Example 3: Domain-Specific Search

```python
results = service.hybrid_search(
    query="Traffic rules for overspeeding",
    n_results=5,
    domain_filter="traffic"  # Only search traffic domain
)
```

---

## Performance Tips

1. **First Query is Slow**: Models load on first use (~5-10 sec)
2. **Use 4-bit Quantization**: `llama3:8b-instruct-q4_K_M` (fast, ~6GB RAM)
3. **Batch Processing**: Process multiple queries together
4. **GPU Acceleration**: If you have a GPU, set `CUDA_VISIBLE_DEVICES=0`

---

## Troubleshooting

### "Ollama not found"
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve

# Download model
ollama pull llama3:8b-instruct-q4_K_M
```

### "No documents found"
```bash
# Make sure you've ingested documents
python scripts/ingest_semantic.py
```

### "Out of memory"
- Close other applications
- Use 4-bit quantized model
- Reduce batch size in services

---

## Integration with Existing Code

To use the new pipeline in your existing orchestrator:

```python
from app.services.enhanced_retriever_service import get_enhanced_retriever_service
from app.services.ollama_service import get_ollama_service

# In your orchestrator's initialize method:
async def initialize(self):
    self.retriever = await get_enhanced_retriever_service()
    self.ollama = await get_ollama_service()

# In your query processing:
async def process_query(self, query: str):
    # Retrieve with hybrid search
    result = await self.retriever.retrieve(query, n_results=5)
    
    # Generate with local LLM
    answer = await self.ollama.generate_with_context(
        query=query,
        contexts=result.documents
    )
    
    return answer
```

---

## Next Steps

1. ✅ Run setup: `./setup_hybrid_rag.sh`
2. ✅ Ingest PDFs: `python scripts/ingest_semantic.py`
3. ✅ Test: `python test_hybrid_rag.py`
4. 🔄 Update your orchestrator to use new services
5. 🚀 Deploy and enjoy local, fast, accurate RAG!

---

## Documentation

- Full architecture: [docs/HYBRID_RAG_ARCHITECTURE.md](HYBRID_RAG_ARCHITECTURE.md)
- Component docs: See docstrings in each service file
- Ollama docs: https://ollama.ai/docs

---

**Questions?** Review the test scripts or check service implementations for examples.
