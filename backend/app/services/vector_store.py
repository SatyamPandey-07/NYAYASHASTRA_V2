"""
NyayGuru AI Pro - Vector Store Service
Handles vector embeddings and semantic search using ChromaDB.
"""

from typing import List, Dict, Any, Optional
import logging

try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    from rank_bm25 import BM25Okapi
    import re
    import numpy as np
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

from app.config import settings

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for vector storage and semantic search."""
    
    def __init__(self):
        self.client = None
        self.embedding_model = None
        self.statutes_collection = None
        self.cases_collection = None
        self.documents_collection = None  # For PDF documents
        self.legal_documents_collection = None  # Main collection with ingested PDFs
        self._initialized = False
    
    async def initialize(self):
        """Initialize vector store and embedding model."""
        if self._initialized:
            return
        
        try:
            if CHROMA_AVAILABLE:
                # Initialize ChromaDB with new API
                self.client = chromadb.PersistentClient(
                    path=settings.chroma_persist_dir
                )
                
                # Get or create collections
                self.statutes_collection = self.client.get_or_create_collection(
                    name="statutes",
                    metadata={"description": "Legal statutes and sections"}
                )
                
                self.cases_collection = self.client.get_or_create_collection(
                    name="case_laws",
                    metadata={"description": "Court judgments and case laws"}
                )
                
                # Documents collection for PDFs with domain metadata
                self.documents_collection = self.client.get_or_create_collection(
                    name="documents",
                    metadata={"description": "PDF documents with domain categories"}
                )
                
                # Main legal_documents collection (from ingest_semantic.py)
                self.legal_documents_collection = self.client.get_or_create_collection(
                    name="legal_documents_semantic",  # Match ingestion script
                    metadata={"description": "Legal PDFs with semantic chunking and BGE-M3 embeddings"}
                )
                
                logger.info(f"ChromaDB initialized - legal_documents_semantic: {self.legal_documents_collection.count()} docs")
            
            # Use the same embedding service that was used for ingestion
            from app.services.embedding_service import get_embedding_service
            self.embedding_service = get_embedding_service()
            logger.info(f"Using embedding service with dimension: {self.embedding_service.get_embedding_dimension()}")
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            raise
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text using the same model as ingestion."""
        if hasattr(self, 'embedding_service'):
            return self.embedding_service.embed_query(text).tolist()
        return []
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts using the same model as ingestion."""
        if hasattr(self, 'embedding_service'):
            embeddings = self.embedding_service.embed_documents(texts)
            return embeddings.tolist() if hasattr(embeddings, 'tolist') else embeddings
        return []
    
    async def add_statutes(self, statutes: List[Dict[str, Any]]):
        """Add statutes to vector store."""
        if not self.statutes_collection:
            logger.warning("Vector store not initialized")
            return
        
        documents = []
        metadatas = []
        ids = []
        
        for statute in statutes:
            # Combine title and content for embedding
            doc_text = f"{statute.get('title_en', '')}. {statute.get('content_en', '')}"
            documents.append(doc_text)
            
            metadatas.append({
                "section_number": statute.get("section_number", ""),
                "act_code": statute.get("act_code", ""),
                "act_name": statute.get("act_name", ""),
                "domain": statute.get("domain", ""),
                "title_en": statute.get("title_en", ""),
                "title_hi": statute.get("title_hi", "")
            })
            
            ids.append(f"{statute.get('act_code', 'UNK')}_{statute.get('section_number', 'UNK')}")
        
        # Generate embeddings
        embeddings = self.embed_texts(documents)
        
        # Add to collection
        self.statutes_collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
        logger.info(f"Added {len(statutes)} statutes to vector store")
    
    async def add_cases(self, cases: List[Dict[str, Any]]):
        """Add case laws to vector store."""
        if not self.cases_collection:
            logger.warning("Vector store not initialized")
            return
        
        documents = []
        metadatas = []
        ids = []
        
        for case in cases:
            doc_text = f"{case.get('case_name', '')}. {case.get('summary_en', '')}"
            documents.append(doc_text)
            
            metadatas.append({
                "case_number": case.get("case_number", ""),
                "case_name": case.get("case_name", ""),
                "court": case.get("court", ""),
                "domain": case.get("domain", ""),
                "is_landmark": case.get("is_landmark", False),
                "reporting_year": case.get("reporting_year", 0)
            })
            
            ids.append(str(case.get("id", f"case_{len(ids)}")))
        
        embeddings = self.embed_texts(documents)
        
        self.cases_collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
        logger.info(f"Added {len(cases)} cases to vector store")
    
    async def search_statutes(self, query: str, act_codes: Optional[List[str]] = None,
                             domain: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant statutes."""
        
        print(f"\n[VECTOR_STORE] search_statutes called")
        print(f"[VECTOR_STORE]   Query: {query[:80]}...")
        print(f"[VECTOR_STORE]   Domain: {domain}")
        print(f"[VECTOR_STORE]   Act codes: {act_codes}")
        
        # First try the statutes collection
        formatted = []
        
        statutes_count = self.statutes_collection.count() if self.statutes_collection else 0
        print(f"[VECTOR_STORE]   statutes_collection has {statutes_count} docs")
        
        if self.statutes_collection and statutes_count > 0:
            # Build where filter
            filters = []
            if act_codes:
                filters.append({"act_code": {"$in": act_codes}})
            if domain and domain != "all":
                filters.append({"domain": domain})
                
            where_filter = None
            if len(filters) == 1:
                where_filter = filters[0]
            elif len(filters) > 1:
                where_filter = {"$and": filters}
            
            # Generate query embedding
            query_embedding = self.embed_text(query)
            
            # Search
            results = self.statutes_collection.query(
                query_embeddings=[query_embedding],
                n_results=limit,
                where=where_filter
            )
            
            # Format results
            if results and results["ids"]:
                for i, doc_id in enumerate(results["ids"][0]):
                    metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                    formatted.append({
                        "id": doc_id,
                        "content": results["documents"][0][i] if results["documents"] else "",
                        "distance": results["distances"][0][i] if results["distances"] else 0,
                        **metadata
                    })
        
        # If statutes collection is empty, search legal_documents collection
        if not formatted and self.legal_documents_collection:
            print(f"[VECTOR_STORE]   Statutes collection empty/no results, searching legal_documents...")
            logger.info(f"Statutes collection empty, searching legal_documents with domain: {domain}")
            formatted = await self._search_legal_documents(query, domain, limit)
        
        print(f"[VECTOR_STORE]   search_statutes returning {len(formatted)} results")
        
        # Apply Re-ranking with BM25
        if formatted:
            formatted = self._rerank_with_bm25(query, formatted)
            
        return formatted[:limit]

    def _rerank_with_bm25(self, query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Re-rank retrieved documents using BM25 for keyword relevance."""
        if not documents:
            return []
            
        # Get contents for BM25
        contents = [doc.get("content", "") for doc in documents]
        
        # Tokenize
        def tokenize(text):
            return re.sub(r'[^\w\s]', ' ', text.lower()).split()
            
        tokenized_query = tokenize(query)
        tokenized_corpus = [tokenize(doc) for doc in contents]
        
        # Calculate BM25 scores
        bm25 = BM25Okapi(tokenized_corpus)
        bm25_scores = bm25.get_scores(tokenized_query)
        
        # Normalize BM25 scores
        if max(bm25_scores) > 0:
            bm25_scores = bm25_scores / max(bm25_scores)
            
        # Combine with Vector score (1 - distance)
        for i, doc in enumerate(documents):
            vector_score = doc.get("relevance_score", 1 - doc.get("distance", 0))
            # Hybrid score: 60% BM25, 40% Vector (keywords are king for statutes)
            doc["hybrid_score"] = (0.6 * bm25_scores[i]) + (0.4 * vector_score)
            
        # Sort by hybrid score
        documents.sort(key=lambda x: x.get("hybrid_score", 0), reverse=True)
        return documents
    
    async def search_cases(self, query: str, domain: Optional[str] = None,
                          court: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant case laws."""
        if not self.cases_collection:
            logger.warning("Vector store not initialized")
            return []
        
        where_filter = None
        if domain:
            where_filter = {"domain": domain}
        elif court:
            where_filter = {"court": court}
        
        query_embedding = self.embed_text(query)
        
        results = self.cases_collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where=where_filter
        )
        
        formatted = []
        if results and results["ids"]:
            for i, doc_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                formatted.append({
                    "id": doc_id,
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                    **metadata
                })
        
        # Apply Re-ranking with BM25
        if formatted:
            formatted = self._rerank_with_bm25(query, formatted)
            
        return formatted[:limit]
    
    async def add_documents(self, documents: List[Dict[str, Any]]):
        """Add PDF documents to vector store with domain metadata.
        
        Args:
            documents: List of document chunks with 'text' and metadata fields
        """
        if not self.documents_collection:
            logger.warning("Vector store not initialized")
            return
        
        texts = []
        metadatas = []
        ids = []
        
        for i, doc in enumerate(documents):
            text = doc.get("text", "")
            if not text:
                continue
            
            texts.append(text)
            
            # Extract metadata
            metadatas.append({
                "filename": doc.get("filename", ""),
                "category": doc.get("category", ""),  # Domain from folder
                "domain": doc.get("domain", ""),
                "folder": doc.get("folder", ""),
                "source": doc.get("source", "pdf"),
                "chunk_index": doc.get("chunk_index", 0),
                "total_chunks": doc.get("total_chunks", 1),
            })
            
            # Create unique ID
            doc_id = f"doc_{doc.get('filename', 'unknown')}_{doc.get('chunk_index', i)}"
            ids.append(doc_id)
        
        if not texts:
            logger.warning("No documents to add")
            return
        
        # Generate embeddings
        embeddings = self.embed_texts(texts)
        
        # Add to collection
        self.documents_collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
        logger.info(f"Added {len(texts)} document chunks to vector store")
    
    async def search_documents(self, query: str, domain: Optional[str] = None,
                              category: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant document chunks with domain filtering.
        
        Args:
            query: Search query
            domain: Filter by domain (e.g., 'Criminal', 'Civil_Family')
            category: Filter by category (same as domain)
            limit: Max results to return
            
        Returns:
            List of matching document chunks
        """
        print(f"\n[VECTOR_STORE] search_documents called")
        print(f"[VECTOR_STORE]   Query: {query[:80]}...")
        print(f"[VECTOR_STORE]   Domain: {domain}, Category: {category}")
        
        # Primary search: use legal_documents collection (has the ingested data)
        legal_docs_count = self.legal_documents_collection.count() if self.legal_documents_collection else 0
        print(f"[VECTOR_STORE]   legal_documents_collection has {legal_docs_count} docs")
        
        if self.legal_documents_collection and legal_docs_count > 0:
            print(f"[VECTOR_STORE]   Using legal_documents collection")
            return await self._search_legal_documents(query, domain or category, limit)
        
        # Fallback to documents collection if legal_documents is empty
        if not self.documents_collection:
            print(f"[VECTOR_STORE]   WARNING: No collections available!")
            logger.warning("Vector store not initialized")
            return []
        
        # Build where filter for domain
        where_filter = None
        filter_domain = domain or category
        
        if filter_domain and filter_domain.lower() not in ["all", ""]:
            where_filter = {"domain": filter_domain.lower()}
        
        # Generate query embedding
        query_embedding = self.embed_text(query)
        
        # Search with filter
        results = self.documents_collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where=where_filter
        )
        
        # Format results
        formatted = []
        if results and results["ids"]:
            for i, doc_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                formatted.append({
                    "id": doc_id,
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "content_en": results["documents"][0][i] if results["documents"] else "",
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                    "relevance_score": 1 - (results["distances"][0][i] if results["distances"] else 0),
                    "source": "document",
                    "domain": metadata.get("category", metadata.get("domain", "")),
                    **metadata
                })
        
        # Apply Re-ranking with BM25
        if formatted:
            formatted = self._rerank_with_bm25(query, formatted)
            
        logger.info(f"Document search returned {len(formatted)} results (domain filter: {filter_domain})")
        return formatted[:limit]
    
    async def _search_legal_documents(self, query: str, domain: Optional[str] = None, 
                                      limit: int = 5) -> List[Dict[str, Any]]:
        """Search the main legal_documents collection (ingested PDFs).
        
        This collection uses 'category' field for domain filtering.
        """
        print(f"\n[VECTOR_STORE] _search_legal_documents called")
        print(f"[VECTOR_STORE]   Query: {query[:80]}...")
        print(f"[VECTOR_STORE]   Domain filter: {domain}")
        print(f"[VECTOR_STORE]   Limit: {limit}")
        
        if not self.legal_documents_collection:
            print("[VECTOR_STORE]   ERROR: legal_documents_collection is None!")
            return []
        
        collection_count = self.legal_documents_collection.count()
        print(f"[VECTOR_STORE]   Collection has {collection_count} documents")
        
        # Build where filter - use 'domain' field (that's what ingest_semantic.py uses)
        where_filter = None
        if domain and domain.lower() not in ["all", ""]:
            # Use 'domain' field which is set by ingest_semantic.py
            where_filter = {"domain": domain}
            print(f"[VECTOR_STORE]   Using where filter: {where_filter}")
        
        # Generate query embedding
        print(f"[VECTOR_STORE]   Generating embedding...")
        query_embedding = self.embed_text(query)
        print(f"[VECTOR_STORE]   Embedding generated, length: {len(query_embedding) if query_embedding else 0}")
        
        if not query_embedding:
            print("[VECTOR_STORE]   ERROR: Failed to generate embedding!")
            return []
        
        try:
            # Search with filter
            print(f"[VECTOR_STORE]   Querying ChromaDB...")
            results = self.legal_documents_collection.query(
                query_embeddings=[query_embedding],
                n_results=limit,
                where=where_filter
            )
            
            print(f"[VECTOR_STORE]   Raw results: {len(results.get('ids', [[]])[0]) if results else 0} documents")
            
            # If no results with filter, try without filter
            if (not results or not results["ids"] or not results["ids"][0]) and where_filter:
                print(f"[VECTOR_STORE]   No results with filter, retrying without filter...")
                logger.info(f"No results with domain filter '{domain}', searching all documents")
                results = self.legal_documents_collection.query(
                    query_embeddings=[query_embedding],
                    n_results=limit
                )
                print(f"[VECTOR_STORE]   Without filter: {len(results.get('ids', [[]])[0]) if results else 0} documents")
        except Exception as e:
            print(f"[VECTOR_STORE]   ChromaDB query error: {e}")
            logger.error(f"ChromaDB query error: {e}")
            # Try without filter on error
            results = self.legal_documents_collection.query(
                query_embeddings=[query_embedding],
                n_results=limit
            )
        
        # Format results
        formatted = []
        if results and results["ids"] and results["ids"][0]:
            print(f"[VECTOR_STORE]   Formatting {len(results['ids'][0])} results...")
            for i, doc_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                content = results["documents"][0][i] if results["documents"] else ""
                distance = results["distances"][0][i] if results["distances"] else 0
                
                print(f"[VECTOR_STORE]   Result {i+1}: {doc_id[:50]}... | distance: {distance:.4f} | category: {metadata.get('category', 'N/A')}")
                
                formatted.append({
                    "id": doc_id,
                    "content": content,
                    "content_en": content,
                    "distance": distance,
                    "relevance_score": 1 - distance,
                    "source": "legal_document",
                    "domain": metadata.get("category", ""),
                    "filename": metadata.get("filename", ""),
                    "category": metadata.get("category", ""),
                    **metadata
                })
        else:
            print("[VECTOR_STORE]   WARNING: No results found!")
        
        # Apply Re-ranking with BM25
        if formatted:
            print(f"[VECTOR_STORE]   Re-ranking with BM25...")
            formatted = self._rerank_with_bm25(query, formatted)
            
        print(f"[VECTOR_STORE]   Returning {len(formatted)} documents")
        logger.info(f"Legal documents search returned {len(formatted)} results (domain: {domain})")
        return formatted[:limit]


# Singleton instance
_vector_store: Optional[VectorStoreService] = None


async def get_vector_store() -> VectorStoreService:
    """Get or create vector store singleton."""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
        await _vector_store.initialize()
    return _vector_store

