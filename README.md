<div align="center">

# 🏛️ NYAYASHASTRA

![NYAYASHASTRA](https://img.shields.io/badge/NYAYASHASTRA-AI%20Legal%20Assistant-blueviolet?style=for-the-badge)
![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-yellow?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript)

**AI-Powered Legal Assistant for Indian Law**

_A Production-Grade Multi-Agent RAG System with Domain Guardrails, Hybrid Retrieval, and Bilingual Support_

[Live Demo](#-quick-start) · [API Docs](http://localhost:8000/docs) · [Architecture](#-system-architecture)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Multi-Agent RAG Pipeline](#-multi-agent-rag-pipeline)
- [Domain Guardrails & BM25 Classification](#-domain-guardrails--bm25-classification)
- [Hybrid Retrieval System](#-hybrid-retrieval-system)
- [Quick Start](#-quick-start)
- [Data Ingestion](#-data-ingestion)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Tech Stack](#-tech-stack)
- [Disclaimer](#-disclaimer)

---

## 🎯 Overview

**NYAYASHASTRA** (Sanskrit: न्यायशास्त्र - "Science of Justice") is a sophisticated AI-powered legal assistant designed specifically for Indian law. It implements a **Multi-Agent Retrieval-Augmented Generation (RAG)** architecture with:

- **7 Specialized AI Agents** orchestrated in a sequential pipeline
- **Hybrid Retrieval** combining BM25 keyword search + semantic vector search
- **Domain Guardrails** ensuring queries are answered only within the selected legal domain
- **15,775+ Legal Documents** from various Indian legal domains
- **Bilingual Support** for English and Hindi (हिंदी)

### Supported Legal Domains

| Domain | Description | Example Topics |
|--------|-------------|----------------|
| 🚗 **Traffic** | Motor Vehicles Act, Road Safety | Red light violations, drunk driving, license rules |
| ⚖️ **Criminal** | IPC, BNS, CrPC | Murder, theft, assault, bail provisions |
| 👨‍👩‍👧 **Civil_Family** | Hindu Marriage Act, Divorce Laws | Divorce, custody, maintenance, succession |
| 🏢 **Corporate** | Companies Act, SEBI Regulations | Company formation, director duties, compliance |
| 💻 **IT_Cyber** | IT Act 2000, Cyber Crime | Hacking, data theft, online fraud |
| 🏠 **Property** | Transfer of Property Act | Land registration, tenancy, easements |
| 📜 **Constitutional** | Constitution of India | Fundamental rights, writs, amendments |
| 🌿 **Environment** | Environmental Protection Act | Pollution, wildlife, forest conservation |

---

## ✨ Key Features

### 🤖 Multi-Agent Intelligence
Seven specialized AI agents work in an orchestrated pipeline, each handling a specific aspect of legal query processing.

### 🛡️ Domain Guardrails
BM25-based hybrid classifier ensures queries are answered only within the user-selected legal domain. Irrelevant queries are politely rejected.

### 📚 Hybrid RAG Retrieval
Combines ChromaDB vector search (semantic) with BM25 keyword matching for superior retrieval accuracy.

### 🌐 Bilingual Support
Full support for English and Hindi, with automatic language detection (including Hinglish).

### 📄 15,775+ Legal Documents
Pre-ingested PDFs from 8 legal domains stored in ChromaDB for instant retrieval.

### ✅ Verified Citations
All responses include citations linked to official sources (Indian Kanoon, Government Gazette).

### 🎨 3D Agent Visualization
Real-time Three.js visualization showing agent orchestration status.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Landing     │  │    Chat      │  │  IPC↔BNS    │  │  Documents   │        │
│  │    Page      │  │  Interface   │  │  Comparison  │  │    Upload    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│         │                 │                 │                 │                 │
│         └─────────────────┴─────────────────┴─────────────────┘                 │
│                                     │                                           │
│                    ┌────────────────┴────────────────┐                          │
│                    │   React + TypeScript + Vite     │                          │
│                    │   TailwindCSS + Shadcn/ui       │                          │
│                    │   React Three Fiber (3D)        │                          │
│                    └────────────────┬────────────────┘                          │
│                                     │                                           │
└─────────────────────────────────────┼───────────────────────────────────────────┘
                                      │ HTTP/REST + SSE (Streaming)
                                      │
┌─────────────────────────────────────┼───────────────────────────────────────────┐
│                                 BACKEND                                          │
│                    ┌────────────────┴────────────────┐                          │
│                    │         FastAPI Server          │                          │
│                    │    (CORS, Auth, Validation)     │                          │
│                    └────────────────┬────────────────┘                          │
│                                     │                                           │
│    ┌────────────────────────────────┼────────────────────────────────────┐     │
│    │                                │                                     │     │
│    ▼                                ▼                                     ▼     │
│ ┌──────────┐                 ┌─────────────┐                      ┌──────────┐ │
│ │  /chat   │                 │ /statutes   │                      │  /docs   │ │
│ │  Routes  │                 │   Routes    │                      │  Routes  │ │
│ └────┬─────┘                 └──────┬──────┘                      └────┬─────┘ │
│      │                              │                                   │      │
│      │         ┌────────────────────┴───────────────────────────┐      │      │
│      │         │              SERVICE LAYER                      │      │      │
│      │         │  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │      │      │
│      │         │  │ LLM Service │  │ BM25 Service│  │ Statute │ │      │      │
│      │         │  │ (Groq API)  │  │ (Classifier)│  │ Service │ │      │      │
│      │         │  └─────────────┘  └─────────────┘  └─────────┘ │      │      │
│      │         └────────────────────────────────────────────────┘      │      │
│      │                                                                  │      │
│      ▼                                                                  │      │
│ ┌────────────────────────────────────────────────────────────────────────────┐ │
│ │                        AGENT ORCHESTRATOR                                   │ │
│ │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │ │
│ │  │ Query   │→ │ Statute │→ │  Case   │→ │Regulatory│→ │Citation │          │ │
│ │  │ Agent   │  │ Agent   │  │ Agent   │  │ Agent   │  │ Agent   │          │ │
│ │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │ │
│ │       │                                                    │               │ │
│ │       │            ┌─────────┐  ┌─────────┐               │               │ │
│ │       │            │ Summary │→ │Response │←──────────────┘               │ │
│ │       │            │ Agent   │  │ Agent   │                               │ │
│ │       │            └─────────┘  └─────────┘                               │ │
│ │       │                              │                                     │ │
│ │       └──────────────────────────────┼─────────────────────────────────── │ │
│ │                    AgentContext (shared state)                             │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│                                     │                                           │
│    ┌────────────────────────────────┼────────────────────────────────────┐     │
│    │                                │                                     │     │
│    ▼                                ▼                                     ▼     │
│ ┌──────────────┐          ┌──────────────────┐              ┌──────────────┐   │
│ │  PostgreSQL  │          │    ChromaDB      │              │   Groq API   │   │
│ │   Database   │          │  Vector Store    │              │   (LLM)      │   │
│ │              │          │                  │              │              │   │
│ │ • Statutes   │          │ • legal_documents│              │ • llama-3.1  │   │
│ │ • Cases      │          │   (15,775 docs)  │              │ • 8b-instant │   │
│ │ • Mappings   │          │ • Embeddings     │              │              │   │
│ │ • Sessions   │          │   (384-dim)      │              │              │   │
│ └──────────────┘          └──────────────────┘              └──────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 Multi-Agent RAG Pipeline

The heart of NYAYASHASTRA is its **7-Agent Orchestrated Pipeline**. Each agent is a specialized component that processes the query sequentially, enriching a shared `AgentContext` object.

### Agent Flow Diagram

```
                                    User Query
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              ORCHESTRATOR                                      │
│                    (backend/app/agents/orchestrator.py)                        │
│                                                                                │
│   Creates AgentContext with: query, language, session_id, specified_domain    │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  1️⃣  QUERY UNDERSTANDING AGENT                                                 │
│      (backend/app/agents/query_agent.py)                                       │
│                                                                                │
│  • Language Detection (English / Hindi / Hinglish)                            │
│  • BM25 Domain Classification (Traffic, Criminal, Civil_Family, etc.)         │
│  • Domain Guardrail Check:                                                     │
│      - If query matches specified_domain → is_relevant = True                 │
│      - If mismatch → is_relevant = False, rejection_message set               │
│  • Entity Extraction (section numbers, act names)                             │
│  • Query Reformulation with domain context                                     │
│                                                                                │
│  Output: detected_language, detected_domain, is_relevant, applicable_acts     │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                          (if is_relevant = False, skip to Response Agent)
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  2️⃣  STATUTE RETRIEVAL AGENT                                                   │
│      (backend/app/agents/statute_agent.py)                                     │
│                                                                                │
│  • Vector Search in ChromaDB (legal_documents collection)                     │
│  • Domain-filtered retrieval using 'category' metadata                        │
│  • BM25 Re-ranking for keyword relevance boost                                │
│  • SQL Database lookup for structured statutes                                │
│                                                                                │
│  Output: statutes[] (up to 8 relevant documents)                              │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  3️⃣  CASE LAW AGENT                                                            │
│      (backend/app/agents/case_agent.py)                                        │
│                                                                                │
│  • Retrieves relevant Supreme Court / High Court judgments                    │
│  • Identifies landmark cases                                                  │
│  • Vector search in case_laws collection                                      │
│                                                                                │
│  Output: case_laws[] (landmark judgments with citations)                      │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  4️⃣  REGULATORY FILTER AGENT                                                   │
│      (backend/app/agents/regulatory_agent.py)                                  │
│                                                                                │
│  • Applies domain-specific regulatory context                                 │
│  • Sets applicable_acts based on domain                                       │
│  • Adds jurisdiction information                                              │
│  • Adds regulatory_notes (authorities, courts, etc.)                          │
│                                                                                │
│  Output: regulatory_notes, applicable_acts updated                            │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  5️⃣  CITATION AGENT                                                            │
│      (backend/app/agents/citation_agent.py)                                    │
│                                                                                │
│  • Generates verified citations for all retrieved content                     │
│  • Links to official sources (Indian Kanoon, Government Gazette)              │
│  • Cleans OCR artifacts from PDF extractions                                  │
│  • Removes amendment annotations for readability                              │
│                                                                                │
│  Output: citations[] (verified, linked citations)                             │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  6️⃣  SUMMARIZATION AGENT                                                       │
│      (backend/app/agents/summarization_agent.py)                               │
│                                                                                │
│  • Extracts key points from retrieved documents                               │
│  • Prepares concise summaries for LLM context                                 │
│                                                                                │
│  Output: Summarized context for response generation                           │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  7️⃣  RESPONSE SYNTHESIS AGENT                                                  │
│      (backend/app/agents/response_agent.py)                                    │
│                                                                                │
│  • Builds system prompt using SystemPromptBuilder                             │
│  • Includes all retrieved documents as context                                │
│  • Calls LLM (Groq API - llama-3.1-8b-instant)                                │
│  • Secondary domain relevance check (keyword + LLM verification)              │
│  • Generates bilingual response (English + Hindi)                             │
│  • Fallback to template response if LLM unavailable                           │
│                                                                                │
│  Output: response, response_hi (final answer with citations)                  │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                            📋 Final Response to User
                     (with statutes, citations, case_laws)
```

### AgentContext - Shared State Object

All agents share an `AgentContext` object that accumulates information:

```python
class AgentContext:
    # Input
    query: str                      # User's question
    specified_domain: str           # Domain selected by user (e.g., "Traffic")
    language: str                   # Requested language
    
    # Query Agent outputs
    detected_language: str          # "en", "hi", or "hinglish"
    detected_domain: str            # BM25-classified domain
    is_relevant: bool               # Domain guardrail result
    rejection_message: str          # Message if query rejected
    applicable_acts: List[str]      # e.g., ["Motor Vehicles Act", "Road Safety Rules"]
    
    # Retrieval outputs
    statutes: List[Dict]            # Retrieved legal documents
    case_laws: List[Dict]           # Retrieved case judgments
    citations: List[Dict]           # Verified citations with URLs
    ipc_bns_mappings: List[Dict]    # IPC↔BNS cross-references
    
    # Final output
    response: str                   # English response
    response_hi: str                # Hindi response
```

---

## 🛡️ Domain Guardrails & BM25 Classification

### How Domain Guardrails Work

The system ensures that queries are answered **only within the user-selected domain**. This prevents the AI from answering unrelated questions.

```
User selects: "Traffic" domain
User asks: "What is the penalty for murder?"

┌─────────────────────────────────────────────────────────────┐
│                    BM25 DOMAIN CLASSIFIER                    │
│              (backend/app/services/bm25_service.py)          │
│                                                              │
│  1. Tokenize query: ["penalty", "murder"]                   │
│                                                              │
│  2. Calculate BM25 scores against domain corpora:           │
│     • Traffic: 0.12 (low - no traffic keywords)             │
│     • Criminal: 0.89 (high - "murder" matches)              │
│     • Civil_Family: 0.05                                    │
│     ...                                                      │
│                                                              │
│  3. Predicted domain: Criminal (confidence: 0.89)           │
│                                                              │
│  4. Compare with specified_domain (Traffic):                │
│     • is_match = False (Criminal ≠ Traffic)                 │
│     • Score for Traffic = 0.12 (below threshold)            │
│                                                              │
│  5. Result: is_relevant = False                             │
│     rejection_message = "Your query about 'murder' seems    │
│     related to Criminal law. Please select the Criminal     │
│     domain for accurate information."                        │
└─────────────────────────────────────────────────────────────┘
```

### BM25 Hybrid Scoring

The classifier uses a **hybrid scoring approach**:

```python
hybrid_score = (0.6 × BM25_score) + (0.4 × semantic_similarity)
```

- **BM25 Score**: Keyword-based matching using term frequency
- **Semantic Similarity**: Embedding-based similarity using sentence-transformers

### Guardrail Thresholds

```python
STRONG_MATCH = 0.45    # High confidence - definitely this domain
CLOSE_MATCH = 0.25     # Moderate confidence - likely this domain
MIN_MATCH = 0.10       # Minimum threshold to accept
```

---

## 🔍 Hybrid Retrieval System

### Vector Store Architecture

```
ChromaDB (backend/chroma_db/)
│
├── Collection: legal_documents (15,775 documents)
│   │
│   ├── Documents from backend/data/
│   │   ├── Traffic/          → category: "Traffic"
│   │   ├── Criminal/         → category: "Criminal"
│   │   ├── Civil_Family/     → category: "Civil_Family"
│   │   ├── Corporate/        → category: "Corporate"
│   │   ├── IT_Cyber/         → category: "IT_Cyber"
│   │   ├── Property/         → category: "Property"
│   │   ├── Constitutional/   → category: "Constitutional"
│   │   └── Environment/      → category: "Environment"
│   │
│   ├── Embeddings: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
│   │               (384-dimensional vectors)
│   │
│   └── Metadata: {filename, category, chunk_index, source}
│
├── Collection: statutes (structured IPC/BNS sections)
├── Collection: case_laws (court judgments)
└── Collection: documents (user uploads)
```

### Retrieval Pipeline

```
Query: "What is the penalty for jumping red light?"
Domain: Traffic

Step 1: VECTOR SEARCH
┌─────────────────────────────────────────────────────────────┐
│  ChromaDB.query(                                            │
│    query_embedding = embed("penalty jumping red light"),    │
│    n_results = 5,                                           │
│    where = {"category": "Traffic"}   ← Domain filter        │
│  )                                                          │
│                                                              │
│  Returns: 5 documents with cosine distance scores           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
Step 2: BM25 RE-RANKING
┌─────────────────────────────────────────────────────────────┐
│  For each document:                                         │
│    bm25_score = BM25(query_tokens, document_tokens)         │
│    vector_score = 1 - cosine_distance                       │
│    hybrid_score = (0.6 × bm25_score) + (0.4 × vector_score) │
│                                                              │
│  Sort by hybrid_score descending                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
Step 3: RETURN TOP-K RESULTS
┌─────────────────────────────────────────────────────────────┐
│  Return top 5 documents with:                               │
│    • content (cleaned legal text)                           │
│    • metadata (filename, category, source)                  │
│    • relevance_score                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **npm** or **yarn**
- **Groq API Key** (free at https://console.groq.com)

### Starting the Backend

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
# Edit backend/.env file with your API keys:
#   GROQ_API_KEY=your_groq_api_key
#   GROQ_MODEL=llama-3.1-8b-instant

# 5. Start the server
python -m uvicorn app.main:app --reload --port 8000

# Server will start at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Starting the Frontend

```bash
# 1. From project root directory
cd NYAYASHASTRA

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# Frontend will start at http://localhost:5173
```

### Verify Everything is Working

1. Open http://localhost:8000/health - should return `{"status": "healthy"}`
2. Open http://localhost:5173 - should show the landing page
3. Select a domain (e.g., Traffic) and ask a question

---

## 📥 Data Ingestion

### Pre-Ingested Data

The project comes with **15,775 legal documents** already ingested into ChromaDB from `backend/data/`:

```
backend/data/
├── Traffic/           # Motor Vehicles Act, Road Safety
├── Criminal/          # IPC, BNS, CrPC
├── Civil_Family/      # Hindu Marriage Act, Family Laws
├── Corporate/         # Companies Act, SEBI
├── IT_Cyber/          # IT Act 2000
├── Property/          # Transfer of Property Act
├── Constitutional/    # Constitution of India
└── Environment/       # EPA, Wildlife Protection
```

### Re-Ingesting Data (if needed)

If you need to re-ingest the legal PDFs:

```bash
cd backend

# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Run hybrid ingestion (PDFs → ChromaDB, CSVs → PostgreSQL)
python scripts/ingest_hybrid.py

# This will:
# 1. Read all PDFs from backend/data/
# 2. Chunk them into ~1000 character segments
# 3. Generate embeddings using sentence-transformers
# 4. Store in ChromaDB with category metadata
```

### Adding New Documents

To add documents to a new domain:

```bash
# 1. Create folder with domain name
mkdir backend/data/NewDomain

# 2. Add PDF files to the folder
# 3. Run ingestion
python scripts/ingest_hybrid.py

# 4. Update domain list in:
#    - backend/app/services/bm25_service.py (DOMAIN_KEYWORDS)
#    - backend/app/agents/regulatory_agent.py (DOMAIN_ACTS)
#    - frontend DomainSelection component
```

---

## 📁 Project Structure

```
NYAYASHASTRA/
│
├── 📁 backend/                          # FastAPI Backend
│   │
│   ├── 📁 app/
│   │   ├── __init__.py
│   │   ├── main.py                      # FastAPI app entry point
│   │   ├── config.py                    # Environment settings
│   │   ├── database.py                  # SQLAlchemy setup
│   │   ├── models.py                    # Database models
│   │   ├── schemas.py                   # Pydantic schemas
│   │   │
│   │   ├── 📁 agents/                   # Multi-Agent System
│   │   │   ├── base.py                  # AgentContext & BaseAgent
│   │   │   ├── orchestrator.py          # Agent pipeline coordination
│   │   │   ├── query_agent.py           # Query understanding + guardrails
│   │   │   ├── statute_agent.py         # Statute/document retrieval
│   │   │   ├── case_agent.py            # Case law retrieval
│   │   │   ├── regulatory_agent.py      # Domain filtering
│   │   │   ├── citation_agent.py        # Citation generation
│   │   │   ├── summarization_agent.py   # Summary extraction
│   │   │   └── response_agent.py        # LLM response synthesis
│   │   │
│   │   ├── 📁 routes/                   # API Endpoints
│   │   │   ├── chat.py                  # /api/chat endpoints
│   │   │   ├── statutes.py              # /api/statutes endpoints
│   │   │   ├── cases.py                 # /api/cases endpoints
│   │   │   ├── documents.py             # /api/documents endpoints
│   │   │   └── stats.py                 # /api/stats endpoints
│   │   │
│   │   └── 📁 services/                 # Business Logic
│   │       ├── llm_service.py           # Groq/OpenAI integration
│   │       ├── vector_store.py          # ChromaDB operations
│   │       ├── bm25_service.py          # BM25 domain classifier
│   │       ├── retriever_service.py     # Hybrid retrieval
│   │       ├── statute_service.py       # Statute database queries
│   │       ├── case_service.py          # Case law queries
│   │       ├── chat_service.py          # Chat session management
│   │       ├── system_prompt.py         # LLM prompt templates
│   │       └── auth_service.py          # Authentication
│   │
│   ├── 📁 data/                         # Legal PDFs by domain
│   │   ├── Traffic/
│   │   ├── Criminal/
│   │   ├── Civil_Family/
│   │   └── ... (8 domains)
│   │
│   ├── 📁 chroma_db/                    # ChromaDB persistent storage
│   │   └── (vector embeddings)
│   │
│   ├── 📁 scripts/                      # Utility scripts
│   │   ├── ingest_hybrid.py             # PDF ingestion
│   │   └── seed_db.py                   # Database seeding
│   │
│   ├── .env                             # Environment variables
│   └── requirements.txt                 # Python dependencies
│
├── 📁 src/                              # React Frontend
│   │
│   ├── 📁 components/
│   │   ├── ChatInterface.tsx            # Main chat UI
│   │   ├── DomainSelection.tsx          # Domain picker
│   │   ├── AgentOrchestration3D.tsx     # 3D visualization
│   │   ├── AgentStatusPanel.tsx         # Agent status display
│   │   ├── CitationsPanel.tsx           # Citation viewer
│   │   ├── CitationViewer.tsx           # Citation modal
│   │   ├── CaseLawsPanel.tsx            # Case law display
│   │   ├── RetrievedStatutesPanel.tsx   # Retrieved docs
│   │   ├── EnhancedIPCBNSComparison.tsx # IPC↔BNS comparison
│   │   ├── DocumentUpload.tsx           # File upload
│   │   ├── Header.tsx                   # Navigation
│   │   └── 📁 ui/                       # Shadcn components
│   │
│   ├── 📁 pages/
│   │   ├── Index.tsx                    # Main dashboard
│   │   ├── Comparison.tsx               # IPC↔BNS page
│   │   ├── Documents.tsx                # Document management
│   │   └── SignInPage.tsx               # Authentication
│   │
│   ├── 📁 services/
│   │   └── api.ts                       # API client
│   │
│   ├── 📁 hooks/
│   │   ├── useApi.ts                    # API hooks
│   │   └── useChatContext.tsx           # Chat state
│   │
│   ├── App.tsx                          # Root component
│   └── main.tsx                         # Entry point
│
├── package.json                         # Node dependencies
├── vite.config.ts                       # Vite configuration
├── tailwind.config.ts                   # Tailwind configuration
└── README.md                            # This file
```

---

## 📡 API Reference

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/` | Send a legal query (non-streaming) |
| `POST` | `/api/chat/stream` | Send query with SSE streaming |
| `GET` | `/api/chat/sessions` | Get all chat sessions |
| `GET` | `/api/chat/sessions/{id}` | Get specific session |
| `GET` | `/api/chat/sessions/{id}/messages` | Get session messages |

#### POST /api/chat/

Request:
```json
{
  "content": "What is the penalty for jumping red light?",
  "domain": "Traffic",
  "language": "en",
  "session_id": "optional-uuid"
}
```

Response:
```json
{
  "id": "uuid",
  "session_id": "uuid",
  "role": "assistant",
  "content": "According to Section 184 of the Motor Vehicles Act...",
  "content_hi": "मोटर वाहन अधिनियम की धारा 184 के अनुसार...",
  "citations": [...],
  "statutes": [...],
  "case_laws": [...],
  "detected_domain": "Traffic",
  "detected_language": "en",
  "execution_time_seconds": 2.5
}
```

### Statute Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/statutes/` | List all statutes |
| `GET` | `/api/statutes/search?q=murder` | Search statutes |
| `GET` | `/api/statutes/{id}` | Get specific statute |
| `GET` | `/api/statutes/mappings` | Get IPC↔BNS mappings |

### Document Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents/upload` | Upload document for analysis |
| `GET` | `/api/documents/{id}` | Get document details |
| `GET` | `/api/documents/{id}/summary` | Get AI summary |

---

## ⚙️ Configuration

### Backend Environment Variables (backend/.env)

```env
# ===========================================
# API CONFIGURATION
# ===========================================
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=true
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ===========================================
# DATABASE
# ===========================================
# SQLite (default - easy setup)
DATABASE_URL=sqlite:///./nyayguru.db

# PostgreSQL (production)
# DATABASE_URL=postgresql://user:pass@host:5432/nyayashastra

# ===========================================
# VECTOR DATABASE
# ===========================================
CHROMA_PERSIST_DIR=./chroma_db
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

# ===========================================
# LLM CONFIGURATION
# ===========================================
# Groq API (Primary - Fast & Free tier available)
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# OpenAI (Fallback)
OPENAI_API_KEY=sk-your_openai_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# ===========================================
# AUTHENTICATION (Optional)
# ===========================================
SECRET_KEY=your-secret-key-for-jwt
CLERK_SECRET_KEY=your-clerk-secret-key
```

### Frontend Environment Variables (.env in root)

```env
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_your_clerk_key
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Runtime |
| FastAPI | 0.104+ | REST API Framework |
| SQLAlchemy | 2.0+ | ORM |
| ChromaDB | 0.4+ | Vector Database |
| Sentence-Transformers | 2.2+ | Embeddings |
| rank-bm25 | 0.2+ | BM25 Ranking |
| Groq SDK | 0.4+ | LLM API Client |
| Uvicorn | 0.24+ | ASGI Server |
| Pydantic | 2.0+ | Validation |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18+ | UI Framework |
| TypeScript | 5.0+ | Type Safety |
| Vite | 5.0+ | Build Tool |
| TailwindCSS | 3.0+ | Styling |
| Shadcn/ui | Latest | Components |
| React Three Fiber | 8.0+ | 3D Visualization |
| Framer Motion | 10+ | Animations |
| React Query | 5.0+ | Data Fetching |

---

## ⚠️ Disclaimer

> **IMPORTANT**: This service is for **informational and educational purposes only** and does **NOT constitute legal advice**.
>
> - The information provided by NYAYASHASTRA should not be considered as a substitute for professional legal counsel
> - Always consult a qualified legal professional for specific legal matters
> - Laws and their interpretations can change; verify all information with official government sources
> - The AI may occasionally provide inaccurate information; always cross-reference with official sources

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Contributors

- **Satyam Pandey** - [SatyamPandey-07](https://github.com/SatyamPandey-07)

---

<div align="center">

**Made with ❤️ for the Indian Legal Community**

⭐ Star this repo if you find it helpful!

[Report Bug](https://github.com/SatyamPandey-07/NYAYASHASTRA/issues) · [Request Feature](https://github.com/SatyamPandey-07/NYAYASHASTRA/issues)

</div>
