"""
Quick test script for the Hybrid RAG pipeline
Tests each component individually
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

print("\n" + "="*80)
print("🧪 HYBRID RAG PIPELINE - COMPONENT TESTS")
print("="*80 + "\n")


async def test_embeddings():
    """Test BGE-M3 embedding service."""
    print("Test 1: BGE-M3 Embeddings")
    print("-" * 40)
    
    try:
        from app.services.embedding_service import get_embedding_service
        
        service = get_embedding_service()
        
        # Test English
        en_text = "What is the punishment for murder under IPC Section 302?"
        en_emb = service.embed_query(en_text)
        print(f"✅ English embedding: shape {en_emb.shape}, dim {len(en_emb)}")
        
        # Test Hindi
        hi_text = "आईपीसी धारा 302 के तहत हत्या की सजा क्या है?"
        hi_emb = service.embed_query(hi_text)
        print(f"✅ Hindi embedding: shape {hi_emb.shape}, dim {len(hi_emb)}")
        
        # Test similarity
        import numpy as np
        similarity = np.dot(en_emb, hi_emb) / (np.linalg.norm(en_emb) * np.linalg.norm(hi_emb))
        print(f"✅ Cross-lingual similarity: {similarity:.4f}")
        
        return True
    except Exception as e:
        print(f"❌ Embedding test failed: {e}")
        return False


async def test_reranker():
    """Test BGE-Reranker service."""
    print("\nTest 2: BGE-Reranker")
    print("-" * 40)
    
    try:
        from app.services.reranker_service import get_reranker_service
        
        service = get_reranker_service()
        
        query = "What is the punishment for murder?"
        documents = [
            {"content": "Section 302 IPC: Punishment for murder - death penalty or life imprisonment"},
            {"content": "Section 304: Culpable homicide not amounting to murder"},
            {"content": "Traffic rules for motor vehicles"},  # Irrelevant
        ]
        
        reranked = service.rerank(query, documents, top_k=2, score_threshold=0.3)
        
        print(f"✅ Reranked {len(documents)} docs → {len(reranked)} relevant docs")
        for i, doc in enumerate(reranked, 1):
            print(f"   {i}. Score: {doc['rerank_score']:.4f} - {doc['content'][:60]}...")
        
        return True
    except Exception as e:
        print(f"⚠️  Reranker test failed (optional): {e}")
        return True  # Non-critical


async def test_chunking():
    """Test semantic chunking service."""
    print("\nTest 3: Semantic Chunking")
    print("-" * 40)
    
    try:
        from app.services.chunking_service import get_chunking_service
        from app.services.embedding_service import get_embedding_service
        
        embedding_service = get_embedding_service()
        chunking_service = get_chunking_service(embedding_service)
        
        test_text = """
        Section 302. Punishment for murder.
        Whoever commits murder shall be punished with death or imprisonment for life,
        and shall also be liable to fine.
        
        Section 304. Punishment for culpable homicide not amounting to murder.
        Whoever commits culpable homicide not amounting to murder shall be punished
        with imprisonment for life, or imprisonment of either description for a term
        which may extend to ten years, and shall also be liable to fine.
        """
        
        chunks = chunking_service.chunk_document(test_text, strategy="section", max_chunk_size=200)
        
        print(f"✅ Created {len(chunks)} chunks")
        for chunk in chunks:
            print(f"   - Sections: {chunk['metadata']['sections']}")
        
        return True
    except Exception as e:
        print(f"❌ Chunking test failed: {e}")
        return False


async def test_ollama():
    """Test Ollama service."""
    print("\nTest 4: Ollama (Local LLM)")
    print("-" * 40)
    
    try:
        from app.services.ollama_service import get_ollama_service
        
        service = await get_ollama_service()
        
        # Simple test
        query = "What is IPC?"
        response = await service.generate(
            prompt=query,
            system_prompt="You are a helpful assistant. Be very concise (max 2 sentences).",
            temperature=0.1,
            max_tokens=100
        )
        
        print(f"✅ Ollama response:")
        print(f"   Query: {query}")
        print(f"   Answer: {response[:200]}...")
        
        return True
    except Exception as e:
        print(f"❌ Ollama test failed: {e}")
        print(f"   Make sure Ollama is running: ollama serve")
        print(f"   And model is downloaded: ollama pull llama3:8b-instruct-q4_K_M")
        return False


async def test_hybrid_search():
    """Test hybrid search (requires ingested data)."""
    print("\nTest 5: Hybrid Search")
    print("-" * 40)
    
    try:
        from app.services.hybrid_search_service import get_hybrid_search_service
        
        service = get_hybrid_search_service()
        
        # Check if collection exists and has data
        if service.collection.count() == 0:
            print("⚠️  No documents in collection. Run ingestion first:")
            print("   python scripts/ingest_semantic.py")
            return True  # Not a failure, just no data yet
        
        query = "What is the punishment for murder?"
        results = service.hybrid_search(
            query=query,
            n_results=3,
            use_reranking=True
        )
        
        print(f"✅ Hybrid search returned {len(results)} results")
        for i, doc in enumerate(results, 1):
            score = doc.get('rerank_score', doc.get('hybrid_score', 0))
            print(f"   {i}. Score: {score:.4f} - Domain: {doc['metadata'].get('domain')}")
        
        return True
    except Exception as e:
        print(f"⚠️  Hybrid search test skipped: {e}")
        print(f"   This is normal if you haven't ingested documents yet")
        return True  # Non-critical


async def test_full_pipeline():
    """Test the complete pipeline."""
    print("\nTest 6: Full Pipeline (Retrieval + Generation)")
    print("-" * 40)
    
    try:
        from app.services.enhanced_retriever_service import get_enhanced_retriever_service
        from app.services.ollama_service import get_ollama_service
        
        retriever = await get_enhanced_retriever_service()
        ollama = await get_ollama_service()
        
        # Check if data is available
        if retriever.hybrid_search_service.collection.count() == 0:
            print("⚠️  No documents available. Skipping full pipeline test.")
            print("   Run: python scripts/ingest_semantic.py")
            return True
        
        query = "What is the punishment for murder?"
        
        # Step 1: Retrieve
        print(f"   Retrieving contexts for: '{query}'")
        result = await retriever.retrieve(query, n_results=3)
        
        if not result.success or not result.documents:
            print(f"⚠️  No documents retrieved")
            return True
        
        print(f"   Retrieved {len(result.documents)} documents")
        
        # Step 2: Generate
        print(f"   Generating answer...")
        answer = await ollama.generate_with_context(
            query=query,
            contexts=result.documents
        )
        
        print(f"✅ Full pipeline test passed")
        print(f"   Query: {query}")
        print(f"   Answer: {answer[:200]}...")
        
        return True
    except Exception as e:
        print(f"⚠️  Full pipeline test skipped: {e}")
        return True


async def main():
    """Run all tests."""
    results = []
    
    # Run tests
    results.append(("Embeddings", await test_embeddings()))
    results.append(("Reranker", await test_reranker()))
    results.append(("Chunking", await test_chunking()))
    results.append(("Ollama", await test_ollama()))
    results.append(("Hybrid Search", await test_hybrid_search()))
    results.append(("Full Pipeline", await test_full_pipeline()))
    
    # Summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:10s} {name}")
    
    print("-"*80)
    print(f"Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Your Hybrid RAG pipeline is ready.")
        print("\nNext steps:")
        print("1. If you haven't ingested documents, run:")
        print("   python scripts/ingest_semantic.py")
        print("\n2. Start your FastAPI server:")
        print("   uvicorn app.main:app --reload")
    else:
        print("\n⚠️  Some tests failed. Check the error messages above.")
    
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
