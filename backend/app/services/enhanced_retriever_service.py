"""
NyayaShastra - Enhanced Retriever Service with Hybrid RAG
Integrates Phase 1 (Semantic Chunking) + Phase 2 (Hybrid Search + Re-ranking)
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class QueryType(Enum):
    """Type of query for routing."""
    COMPARISON = "comparison"  # IPC vs BNS comparison
    DOCUMENT_SEARCH = "document_search"  # Vector + BM25 search
    GENERAL = "general"  # General legal question


@dataclass
class RetrievalResult:
    """Result from retrieval operations."""
    success: bool
    query_type: QueryType
    documents: List[Dict[str, Any]]
    sql_results: List[Dict[str, Any]]
    fallback_used: bool
    fallback_message: str
    category_requested: Optional[str]
    category_found: Optional[str]


class EnhancedRetrieverService:
    """
    Enhanced retrieval service using Hybrid RAG pipeline.
    Combines semantic search, keyword search, and re-ranking.
    """
    
    def __init__(
        self,
        hybrid_search_service=None,
        embedding_service=None,
        reranker_service=None,
        collection_name: str = "legal_documents_semantic"
    ):
        """
        Initialize enhanced retriever.
        
        Args:
            hybrid_search_service: Hybrid search service
            embedding_service: Embedding service
            reranker_service: Re-ranker service
            collection_name: ChromaDB collection name
        """
        self.hybrid_search_service = hybrid_search_service
        self.embedding_service = embedding_service
        self.reranker_service = reranker_service
        self.collection_name = collection_name
        self._initialized = False
        
    async def initialize(self):
        """Initialize services."""
        if self._initialized:
            return
        
        try:
            # Initialize hybrid search if not provided
            if self.hybrid_search_service is None:
                from app.services.hybrid_search_service import get_hybrid_search_service
                self.hybrid_search_service = get_hybrid_search_service(
                    embedding_service=self.embedding_service,
                    reranker_service=self.reranker_service,
                    collection_name=self.collection_name
                )
            
            # Initialize embedding service if not provided
            if self.embedding_service is None:
                from app.services.embedding_service import get_embedding_service
                self.embedding_service = get_embedding_service()
            
            # Initialize reranker service if not provided
            if self.reranker_service is None:
                from app.services.reranker_service import get_reranker_service
                self.reranker_service = get_reranker_service()
            
            self._initialized = True
            logger.info("✅ Enhanced retriever service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize enhanced retriever: {e}")
            raise
    
    def classify_query(self, query: str) -> Tuple[QueryType, Optional[str]]:
        """
        Classify query type and extract domain if applicable.
        
        Args:
            query: User query
            
        Returns:
            (QueryType, domain) tuple
        """
        import re
        
        query_lower = query.lower()
        
        # Check for IPC/BNS comparison queries
        comparison_patterns = [
            r"compare.*ipc.*bns",
            r"ipc.*vs.*bns",
            r"difference.*ipc.*bns",
            r"ipc\s+\d+.*bns",
            r"bns\s+\d+.*ipc",
        ]
        
        for pattern in comparison_patterns:
            if re.search(pattern, query_lower):
                return QueryType.COMPARISON, None
        
        # Detect domain keywords
        domain_keywords = {
            'traffic': ['traffic', 'vehicle', 'driving', 'motor', 'challan', 'license'],
            'criminal': ['murder', 'theft', 'crime', 'ipc', 'bns', 'assault', 'fir'],
            'it_cyber': ['cyber', 'hacking', 'data', 'privacy', 'computer', 'online'],
            'corporate': ['company', 'corporate', 'business', 'tax', 'gst'],
            'civil_family': ['marriage', 'divorce', 'property', 'inheritance', 'custody'],
            'constitutional': ['constitution', 'fundamental', 'article', 'rights'],
            'environment': ['environment', 'pollution', 'forest', 'wildlife'],
        }
        
        detected_domain = None
        max_matches = 0
        
        for domain, keywords in domain_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in query_lower)
            if matches > max_matches:
                max_matches = matches
                detected_domain = domain
        
        return QueryType.DOCUMENT_SEARCH, detected_domain
    
    async def retrieve(
        self,
        query: str,
        n_results: int = 5,
        domain_filter: Optional[str] = None,
        use_reranking: bool = True
    ) -> RetrievalResult:
        """
        Main retrieval method using hybrid RAG.
        
        Args:
            query: User query
            n_results: Number of results to return
            domain_filter: Optional domain to filter by
            use_reranking: Whether to apply re-ranking
            
        Returns:
            RetrievalResult with documents and metadata
        """
        if not self._initialized:
            await self.initialize()
        
        # Classify query
        query_type, detected_domain = self.classify_query(query)
        
        # Use detected domain if no filter specified
        if domain_filter is None and detected_domain:
            domain_filter = detected_domain
            logger.info(f"Auto-detected domain: {detected_domain}")
        
        # Handle IPC/BNS comparisons (SQL-based)
        if query_type == QueryType.COMPARISON:
            logger.info("Query classified as IPC/BNS comparison (SQL)")
            # TODO: Implement SQL-based comparison retrieval
            return RetrievalResult(
                success=True,
                query_type=query_type,
                documents=[],
                sql_results=[],
                fallback_used=False,
                fallback_message="",
                category_requested=domain_filter,
                category_found=None
            )
        
        # Document search using hybrid RAG
        logger.info(f"Query classified as document search (domain: {domain_filter})")
        
        try:
            # Use hybrid search
            documents = self.hybrid_search_service.hybrid_search(
                query=query,
                n_results=n_results,
                domain_filter=domain_filter,
                use_reranking=use_reranking,
                vector_weight=0.5,
                bm25_weight=0.5,
                rerank_threshold=0.3
            )
            
            # Check if we found relevant documents
            if not documents:
                logger.warning("No documents found for query")
                return RetrievalResult(
                    success=False,
                    query_type=query_type,
                    documents=[],
                    sql_results=[],
                    fallback_used=True,
                    fallback_message="No relevant legal documents found for your query.",
                    category_requested=domain_filter,
                    category_found=None
                )
            
            # Get domain of top result
            category_found = documents[0].get('metadata', {}).get('domain')
            
            logger.info(f"✅ Retrieved {len(documents)} documents (top domain: {category_found})")
            
            return RetrievalResult(
                success=True,
                query_type=query_type,
                documents=documents,
                sql_results=[],
                fallback_used=False,
                fallback_message="",
                category_requested=domain_filter,
                category_found=category_found
            )
            
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            return RetrievalResult(
                success=False,
                query_type=query_type,
                documents=[],
                sql_results=[],
                fallback_used=True,
                fallback_message=f"Retrieval error: {str(e)}",
                category_requested=domain_filter,
                category_found=None
            )
    
    async def retrieve_similar(
        self,
        text: str,
        n_results: int = 5,
        domain_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve similar documents to given text.
        
        Args:
            text: Text to find similar documents for
            n_results: Number of results
            domain_filter: Optional domain filter
            
        Returns:
            List of similar documents
        """
        if not self._initialized:
            await self.initialize()
        
        result = await self.retrieve(
            query=text,
            n_results=n_results,
            domain_filter=domain_filter
        )
        
        return result.documents


# Singleton instance
_retriever_service: Optional[EnhancedRetrieverService] = None


async def get_enhanced_retriever_service() -> EnhancedRetrieverService:
    """Get or create singleton retriever service."""
    global _retriever_service
    if _retriever_service is None:
        _retriever_service = EnhancedRetrieverService()
        await _retriever_service.initialize()
    return _retriever_service


if __name__ == "__main__":
    import asyncio
    
    async def test_retriever():
        """Test the enhanced retriever."""
        retriever = await get_enhanced_retriever_service()
        
        queries = [
            "What is the punishment for murder?",
            "Traffic rules for overspeeding",
            "Cyber crime and hacking laws",
        ]
        
        for query in queries:
            print(f"\n{'='*60}")
            print(f"Query: {query}")
            print('='*60)
            
            result = await retriever.retrieve(query, n_results=3)
            
            print(f"Query Type: {result.query_type.value}")
            print(f"Success: {result.success}")
            print(f"Documents: {len(result.documents)}")
            
            for i, doc in enumerate(result.documents, 1):
                print(f"\n[{i}] Score: {doc.get('rerank_score', doc.get('hybrid_score', 0)):.4f}")
                print(f"    Domain: {doc['metadata'].get('domain')}")
                print(f"    Source: {doc['metadata'].get('source')}")
                print(f"    Content: {doc['content'][:100]}...")
    
    asyncio.run(test_retriever())
