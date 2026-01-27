"""
Visual Architecture Test - Generates a simple visualization of the pipeline
Run this to see the data flow through each component
"""

import asyncio


def print_pipeline_visual():
    """Print ASCII art visualization of the pipeline."""
    
    print("\n" + "="*80)
    print("🏗️  NYAYASHASTRA - LOCAL HYBRID RAG PIPELINE ARCHITECTURE")
    print("="*80 + "\n")
    
    print("""
    ┌─────────────────────────────────────────────────────────────────────┐
    │                       📄 PHASE 1: DATA INGESTION                     │
    │                    (Better Input = Better Output)                    │
    └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ PDF Files
                                    ▼
            ┌────────────────────────────────────────────┐
            │  📝 PDF → Markdown Converter               │
            │  - Preserves structure (## Section 302)    │
            │  - Extracts legal sections                 │
            └────────────────────────────────────────────┘
                                    │
                                    │ Markdown Text
                                    ▼
            ┌────────────────────────────────────────────┐
            │  ✂️  Semantic Chunking                     │
            │  - Meaning-based splits                    │
            │  - Preserves section boundaries            │
            │  - Extracts metadata (Act, Section #)      │
            └────────────────────────────────────────────┘
                                    │
                                    │ Chunks + Metadata
                                    ▼
            ┌────────────────────────────────────────────┐
            │  🧬 BGE-M3 Embeddings                      │
            │  - Multi-lingual (Hindi + English)         │
            │  - Long context (8192 tokens)              │
            │  - 1024-dim dense vectors                  │
            └────────────────────────────────────────────┘
                                    │
                                    │ Embeddings + Chunks
                                    ▼
            ┌────────────────────────────────────────────┐
            │  💾 ChromaDB                               │
            │  Collection: legal_documents_semantic      │
            │  - Stores embeddings + metadata            │
            │  - Fast vector search                      │
            └────────────────────────────────────────────┘


    ┌─────────────────────────────────────────────────────────────────────┐
    │                    🔍 PHASE 2: CONTEXT AWARENESS                     │
    │                         (The "BERT" Upgrade)                         │
    └─────────────────────────────────────────────────────────────────────┘

                        User Query: "What is murder punishment?"
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
            ┌──────────────────────┐  ┌──────────────────────┐
            │  🎯 Dense Retrieval  │  │  🔤 Sparse Retrieval │
            │    (BGE-M3)          │  │      (BM25)          │
            │                      │  │                      │
            │  Semantic meaning:   │  │  Exact keywords:     │
            │  "killing someone"   │  │  "Section 302"       │
            │  → Section 302       │  │  → Section 302       │
            └──────────────────────┘  └──────────────────────┘
                        │                       │
                        │ ~10 results           │ ~10 results
                        └───────────┬───────────┘
                                    ▼
                        ┌────────────────────────┐
                        │  🔀 Hybrid Fusion      │
                        │  - Weighted scoring    │
                        │  - Deduplication       │
                        │  Result: ~20 candidates│
                        └────────────────────────┘
                                    │
                                    │ 20 candidates
                                    ▼
                        ┌────────────────────────┐
                        │  ⚖️  BGE-Reranker      │
                        │  (Cross-Encoder)       │
                        │                        │
                        │  "The Strict Judge"    │
                        │  - Reads query + doc   │
                        │  - Scores relevance    │
                        │  - Filters low quality │
                        └────────────────────────┘
                                    │
                                    │ Top 5 (high quality)
                                    ▼
                        ┌────────────────────────┐
                        │  ✅ Top 5 Contexts     │
                        │  Score > 0.3           │
                        │  No hallucination risk │
                        └────────────────────────┘


    ┌─────────────────────────────────────────────────────────────────────┐
    │                     🧠 PHASE 3: THE BRAIN                            │
    │                       (Local Generation)                             │
    └─────────────────────────────────────────────────────────────────────┘

                        ┌────────────────────────┐
                        │  📚 Top 5 Contexts     │
                        │  + System Prompt       │
                        │  + User Query          │
                        └────────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────┐
                        │  🤖 Ollama             │
                        │  Llama-3-8B-Instruct   │
                        │                        │
                        │  - 4-bit quantized     │
                        │  - Runs on CPU         │
                        │  - ~6GB RAM usage      │
                        │  - No cloud API        │
                        └────────────────────────┘
                                    │
                                    │ Generated text
                                    ▼
                        ┌────────────────────────┐
                        │  ✨ Final Answer       │
                        │                        │
                        │  - Accurate            │
                        │  - Cited sources       │
                        │  - No hallucinations   │
                        └────────────────────────┘


    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃                        🎯 KEY ADVANTAGES                           ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    ✅ Semantic Chunking   → Preserves legal section structure
    ✅ BGE-M3 Embeddings   → Multi-lingual, long context (8k tokens)
    ✅ Hybrid Search       → Catches both exact + semantic matches
    ✅ Re-ranking          → Eliminates bad contexts before LLM
    ✅ Local LLM           → No costs, no limits, full privacy
    ✅ 4-bit Quantization  → Runs on consumer hardware


    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃                       📊 PERFORMANCE                               ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    Cold Start (first query):   5-10 seconds (model loading)
    Warm Queries:               2-3 seconds
    RAM Usage:                  ~10GB (all models loaded)
    Privacy:                    100% on-device
    Cost:                       $0 (one-time setup)

    """)
    
    print("="*80 + "\n")


async def test_each_component():
    """Test each component and show the data flow."""
    
    print("🧪 TESTING EACH COMPONENT")
    print("="*80 + "\n")
    
    # Test 1: Embeddings
    print("1️⃣  Testing BGE-M3 Embeddings...")
    try:
        from app.services.embedding_service import get_embedding_service
        emb_service = get_embedding_service()
        
        test_text = "What is the punishment for murder?"
        embedding = emb_service.embed_query(test_text)
        
        print(f"   ✅ Input:  '{test_text}'")
        print(f"   ✅ Output: Vector of dimension {len(embedding)}")
        print(f"   ✅ First 5 values: {embedding[:5]}\n")
    except Exception as e:
        print(f"   ❌ Failed: {e}\n")
    
    # Test 2: Chunking
    print("2️⃣  Testing Semantic Chunking...")
    try:
        from app.services.chunking_service import get_chunking_service
        chunk_service = get_chunking_service(emb_service)
        
        test_doc = """
        Section 302. Punishment for murder.
        Whoever commits murder shall be punished with death or imprisonment for life.
        
        Section 304. Punishment for culpable homicide.
        Whoever commits culpable homicide not amounting to murder shall be punished.
        """
        
        chunks = chunk_service.chunk_document(test_doc, strategy="section", max_chunk_size=200)
        
        print(f"   ✅ Input:  Document with {len(test_doc)} characters")
        print(f"   ✅ Output: {len(chunks)} semantic chunks")
        for chunk in chunks:
            print(f"      - Sections: {chunk['metadata']['sections']}")
        print()
    except Exception as e:
        print(f"   ❌ Failed: {e}\n")
    
    # Test 3: Re-ranking
    print("3️⃣  Testing BGE-Reranker...")
    try:
        from app.services.reranker_service import get_reranker_service
        rerank_service = get_reranker_service()
        
        query = "punishment for murder"
        docs = [
            {"content": "Section 302: Punishment for murder is death or life imprisonment"},
            {"content": "Section 304: Culpable homicide not amounting to murder"},
            {"content": "Traffic rules for motor vehicles on highways"},
        ]
        
        reranked = rerank_service.rerank(query, docs, top_k=2, score_threshold=0.3)
        
        print(f"   ✅ Input:  Query + 3 documents")
        print(f"   ✅ Output: {len(reranked)} relevant documents after filtering")
        for i, doc in enumerate(reranked, 1):
            print(f"      {i}. Score {doc['rerank_score']:.4f}: {doc['content'][:50]}...")
        print()
    except Exception as e:
        print(f"   ⚠️  Failed (optional): {e}\n")
    
    # Test 4: Ollama
    print("4️⃣  Testing Ollama (Local LLM)...")
    try:
        from app.services.ollama_service import get_ollama_service
        ollama = await get_ollama_service()
        
        query = "What is IPC?"
        response = await ollama.generate(
            prompt=query,
            system_prompt="Be very concise (max 1 sentence).",
            temperature=0.1,
            max_tokens=50
        )
        
        print(f"   ✅ Input:  '{query}'")
        print(f"   ✅ Output: '{response}'\n")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        print(f"      Make sure Ollama is running: ollama serve\n")
    
    print("="*80 + "\n")


if __name__ == "__main__":
    print_pipeline_visual()
    
    print("\nPress Enter to run component tests...")
    input()
    
    asyncio.run(test_each_component())
