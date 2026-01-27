"""
NyayaShastra - Hybrid Search Service (Phase 2: Context Awareness)
Combines Dense (Vector/Semantic) + Sparse (BM25/Keyword) retrieval
Uses Re-ranking to eliminate hallucination sources before LLM sees them
"""

import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import numpy as np

logger = logging.getLogger(__name__)

try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False
    logger.warning("BM25 not available. Install with: pip install rank-bm25")

try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False


class HybridSearchService:
    """
    Hybrid search combining:
    1. Dense Retrieval: BGE-M3 embeddings for semantic search
    2. Sparse Retrieval: BM25 for exact keyword matches
    3. Re-ranking: BGE-Reranker to score and filter results
    """
    
    def __init__(
        self,
        embedding_service=None,
        reranker_service=None,
        chroma_client=None,
        collection_name: str = "legal_documents_semantic"
    ):
        """
        Initialize hybrid search service.
        
        Args:
            embedding_service: BGE-M3 embedding service
            reranker_service: BGE-Reranker service
            chroma_client: ChromaDB client
            collection_name: Name of the collection to search
        """
        self.embedding_service = embedding_service
        self.reranker_service = reranker_service
        self.chroma_client = chroma_client
        self.collection_name = collection_name
        self.collection = None
        self.bm25_index = None
        self.bm25_documents = []
        self._initialized = False
        
    def initialize(self):
        """Lazy initialization of search indices."""
        if self._initialized:
            return
        
        try:
            # Get ChromaDB collection
            if self.chroma_client and CHROMA_AVAILABLE:
                self.collection = self.chroma_client.get_collection(self.collection_name)
                logger.info(f"Loaded ChromaDB collection: {self.collection_name}")
                logger.info(f"Collection size: {self.collection.count()} documents")
            
            # Build BM25 index if available
            if BM25_AVAILABLE and self.collection:
                self._build_bm25_index()
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize hybrid search: {e}")
            raise
    
    def _build_bm25_index(self):
        """Build BM25 index from ChromaDB documents."""
        try:
            logger.info("Building BM25 index...")
            
            # Get all documents from ChromaDB
            results = self.collection.get(include=['documents', 'metadatas'])
            
            self.bm25_documents = []
            tokenized_corpus = []
            
            for doc, metadata in zip(results['documents'], results['metadatas']):
                self.bm25_documents.append({
                    'content': doc,
                    'metadata': metadata
                })
                
                # Tokenize for BM25
                tokens = self._tokenize(doc)
                tokenized_corpus.append(tokens)
            
            # Create BM25 index
            self.bm25_index = BM25Okapi(tokenized_corpus)
            
            logger.info(f"✅ BM25 index built with {len(self.bm25_documents)} documents")
            
        except Exception as e:
            logger.error(f"Failed to build BM25 index: {e}")
            self.bm25_index = None
    
    def _tokenize(self, text: str) -> List[str]:
        """
        Simple tokenization for BM25.
        
        Args:
            text: Text to tokenize
            
        Returns:
            List of tokens
        """
        # Simple word tokenization (lowercase, alphanumeric)
        import re
        tokens = re.findall(r'\w+', text.lower())
        return tokens
    
    def search_vector(
        self,
        query: str,
        n_results: int = 20,
        domain_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Dense retrieval using BGE-M3 embeddings.
        
        Args:
            query: Search query
            n_results: Number of results to return
            domain_filter: Optional domain to filter by
            
        Returns:
            List of documents with similarity scores
        """
        if not self.collection or not self.embedding_service:
            logger.warning("Vector search not available")
            return []
        
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.embed_query(query)
            
            # Build filter if domain specified
            where_filter = None
            if domain_filter:
                where_filter = {"domain": domain_filter}
            
            # Search ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=n_results,
                where=where_filter,
                include=['documents', 'metadatas', 'distances']
            )
            
            # Format results
            documents = []
            for doc, metadata, distance in zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            ):
                # Convert distance to similarity score (1 - normalized distance)
                similarity = 1 / (1 + distance)  # Simple conversion
                
                documents.append({
                    'content': doc,
                    'metadata': metadata,
                    'vector_score': similarity,
                    'source': 'vector'
                })
            
            logger.info(f"Vector search returned {len(documents)} results")
            return documents
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    def search_bm25(
        self,
        query: str,
        n_results: int = 20,
        domain_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Sparse retrieval using BM25 keyword matching.
        
        Args:
            query: Search query
            n_results: Number of results to return
            domain_filter: Optional domain to filter by
            
        Returns:
            List of documents with BM25 scores
        """
        if not self.bm25_index or not BM25_AVAILABLE:
            logger.warning("BM25 search not available")
            return []
        
        try:
            # Tokenize query
            query_tokens = self._tokenize(query)
            
            # Get BM25 scores
            scores = self.bm25_index.get_scores(query_tokens)
            
            # Get top N indices
            top_indices = np.argsort(scores)[::-1][:n_results * 2]  # Get more for filtering
            
            # Build results
            documents = []
            for idx in top_indices:
                doc = self.bm25_documents[idx]
                
                # Apply domain filter if specified
                if domain_filter and doc['metadata'].get('domain') != domain_filter:
                    continue
                
                documents.append({
                    'content': doc['content'],
                    'metadata': doc['metadata'],
                    'bm25_score': float(scores[idx]),
                    'source': 'bm25'
                })
                
                if len(documents) >= n_results:
                    break
            
            logger.info(f"BM25 search returned {len(documents)} results")
            return documents
            
        except Exception as e:
            logger.error(f"BM25 search failed: {e}")
            return []
    
    def hybrid_search(
        self,
        query: str,
        n_results: int = 5,
        domain_filter: Optional[str] = None,
        vector_weight: float = 0.5,
        bm25_weight: float = 0.5,
        use_reranking: bool = True,
        rerank_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Hybrid search combining vector and BM25 with re-ranking.
        
        Args:
            query: Search query
            n_results: Final number of results after re-ranking
            domain_filter: Optional domain to filter by
            vector_weight: Weight for vector scores (0-1)
            bm25_weight: Weight for BM25 scores (0-1)
            use_reranking: Whether to apply re-ranking
            rerank_threshold: Minimum rerank score to keep
            
        Returns:
            Re-ranked list of top N documents
        """
        if not self._initialized:
            self.initialize()
        
        # Step 1: Get results from both retrievers
        retrieve_count = n_results * 4  # Retrieve more for re-ranking
        
        vector_results = self.search_vector(query, n_results=retrieve_count, domain_filter=domain_filter)
        bm25_results = self.search_bm25(query, n_results=retrieve_count, domain_filter=domain_filter)
        
        # Step 2: Merge results with hybrid scoring
        merged = self._merge_results(vector_results, bm25_results, vector_weight, bm25_weight)
        
        # Step 3: Re-rank with cross-encoder
        if use_reranking and self.reranker_service:
            logger.info(f"Re-ranking {len(merged)} candidates...")
            reranked = self.reranker_service.rerank(
                query,
                merged,
                top_k=n_results,
                score_threshold=rerank_threshold
            )
            
            logger.info(f"✅ Hybrid search complete: {len(reranked)} results after re-ranking")
            return reranked
        else:
            # No re-ranking, just return top N by hybrid score
            return merged[:n_results]
    
    def _merge_results(
        self,
        vector_results: List[Dict[str, Any]],
        bm25_results: List[Dict[str, Any]],
        vector_weight: float,
        bm25_weight: float
    ) -> List[Dict[str, Any]]:
        """
        Merge and score results from vector and BM25 search.
        
        Args:
            vector_results: Results from vector search
            bm25_results: Results from BM25 search
            vector_weight: Weight for vector scores
            bm25_weight: Weight for BM25 scores
            
        Returns:
            Merged list sorted by hybrid score
        """
        # Normalize scores
        def normalize_scores(results: List[Dict], score_key: str):
            if not results:
                return
            scores = [r.get(score_key, 0) for r in results]
            max_score = max(scores) if scores else 1
            min_score = min(scores) if scores else 0
            
            for r in results:
                score = r.get(score_key, 0)
                if max_score > min_score:
                    r[f'{score_key}_norm'] = (score - min_score) / (max_score - min_score)
                else:
                    r[f'{score_key}_norm'] = 1.0
        
        normalize_scores(vector_results, 'vector_score')
        normalize_scores(bm25_results, 'bm25_score')
        
        # Build index by content (to detect duplicates)
        merged_dict = {}
        
        # Add vector results
        for doc in vector_results:
            content = doc['content']
            merged_dict[content] = doc
            merged_dict[content]['hybrid_score'] = doc.get('vector_score_norm', 0) * vector_weight
        
        # Add/merge BM25 results
        for doc in bm25_results:
            content = doc['content']
            if content in merged_dict:
                # Already exists, add BM25 score
                merged_dict[content]['hybrid_score'] += doc.get('bm25_score_norm', 0) * bm25_weight
                merged_dict[content]['source'] = 'hybrid'
            else:
                # New document
                merged_dict[content] = doc
                merged_dict[content]['hybrid_score'] = doc.get('bm25_score_norm', 0) * bm25_weight
        
        # Convert back to list and sort by hybrid score
        merged = list(merged_dict.values())
        merged.sort(key=lambda x: x.get('hybrid_score', 0), reverse=True)
        
        return merged


def get_hybrid_search_service(
    embedding_service=None,
    reranker_service=None,
    collection_name: str = "legal_documents_semantic"
) -> HybridSearchService:
    """
    Create hybrid search service instance.
    
    Args:
        embedding_service: Embedding service (optional, will be created if None)
        reranker_service: Reranker service (optional, will be created if None)
        collection_name: ChromaDB collection name
        
    Returns:
        HybridSearchService instance
    """
    # Import services if not provided
    if embedding_service is None:
        from app.services.embedding_service import get_embedding_service
        embedding_service = get_embedding_service()
    
    if reranker_service is None:
        from app.services.reranker_service import get_reranker_service
        reranker_service = get_reranker_service()
    
    # Initialize ChromaDB client
    chroma_client = chromadb.PersistentClient(
        path=str(Path(__file__).parent.parent.parent / "chroma_db")
    )
    
    service = HybridSearchService(
        embedding_service=embedding_service,
        reranker_service=reranker_service,
        chroma_client=chroma_client,
        collection_name=collection_name
    )
    
    service.initialize()
    return service


if __name__ == "__main__":
    # Test hybrid search
    service = get_hybrid_search_service()
    
    query = "What is the punishment for murder under IPC?"
    
    print(f"\nQuery: {query}\n")
    
    results = service.hybrid_search(
        query,
        n_results=5,
        use_reranking=True
    )
    
    print(f"Found {len(results)} results:\n")
    for i, doc in enumerate(results, 1):
        print(f"{i}. [{doc.get('source', 'unknown')}] Score: {doc.get('rerank_score', doc.get('hybrid_score', 0)):.4f}")
        print(f"   Domain: {doc['metadata'].get('domain', 'N/A')}")
        print(f"   Content: {doc['content'][:150]}...")
        print()
