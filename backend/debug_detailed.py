
import asyncio
import sys
import numpy as np
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

async def debug_query_detailed():
    from app.services.bm25_service import get_domain_classifier
    classifier = await get_domain_classifier()
    
    query = "What is the punishment for hitting a pedestrian and killing them?"
    tokenized_query = classifier._tokenize(query)
    
    # BM25 Scores
    bm25_scores = classifier.bm25.get_scores(tokenized_query)
    if max(bm25_scores) > 0:
        norm_bm25 = bm25_scores / max(bm25_scores)
    else:
        norm_bm25 = bm25_scores
        
    # Semantic Scores
    semantic_scores = np.zeros(len(classifier.domains))
    await classifier._get_domain_embeddings()
    query_embedding = classifier.vector_store.embed_text(query)
    
    for i, domain in enumerate(classifier.domains):
        domain_emb = classifier._domain_embeddings.get(domain)
        if domain_emb:
            sim = np.dot(query_embedding, domain_emb) / (np.linalg.norm(query_embedding) * np.linalg.norm(domain_emb))
            semantic_scores[i] = sim
            
    print(f"Query: {query}")
    print(f"Tokens: {tokenized_query}")
    print("\nDetailed Scores:")
    for i, domain in enumerate(classifier.domains):
        print(f"Domain: {domain}")
        print(f"  - BM25 (Norm): {norm_bm25[i]:.4f}")
        print(f"  - Semantic:   {semantic_scores[i]:.4f}")
        hybrid = (0.5 * norm_bm25[i]) + (0.5 * semantic_scores[i])
        print(f"  - Hybrid:     {hybrid:.4f}")

if __name__ == "__main__":
    asyncio.run(debug_query_detailed())
