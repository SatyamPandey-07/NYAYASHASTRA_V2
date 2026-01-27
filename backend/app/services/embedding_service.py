"""
NyayaShastra - Local Embedding Service (MEMORY-OPTIMIZED)
Uses BGE-M3 for Multi-Lingual (Hindi + English), Long Context (8k tokens) embeddings
State-of-the-Art dense retrieval for semantic search
"""

import os
import logging
from typing import List, Union
import numpy as np

# CRITICAL: Force CPU-only mode to prevent OOM crashes
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
os.environ['OMP_NUM_THREADS'] = '4'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

logger = logging.getLogger(__name__)

try:
    from FlagEmbedding import BGEM3FlagModel
    BGE_M3_AVAILABLE = True
except (ImportError, NameError):
    BGEM3FlagModel = None
    BGE_M3_AVAILABLE = False
    logger.warning("BGE-M3 not available. Install with: pip install FlagEmbedding")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False


class EmbeddingService:
    """
    Local embedding service using BGE-M3 for superior semantic understanding.
    Falls back to sentence-transformers if BGE-M3 is not available.
    """
    
    def __init__(self, model_name: str = "BAAI/bge-m3", use_fp16: bool = False):
        """
        Initialize embedding service (MEMORY-OPTIMIZED).
        
        Args:
            model_name: Model identifier (default: BAAI/bge-m3)
            use_fp16: Use half precision - DISABLED for CPU stability
        """
        self.model_name = model_name
        self.use_fp16 = False  # Force FP32 for CPU stability
        self.model = None
        self.embedding_dim = 1024  # BGE-M3 outputs 1024-dim vectors
        self._initialized = False
        
    def initialize(self):
        """Lazy initialization of the embedding model."""
        if self._initialized:
            return
            
        try:
            if BGE_M3_AVAILABLE and "bge-m3" in self.model_name.lower():
                logger.info(f"Loading BGE-M3 model: {self.model_name}")
                self.model = BGEM3FlagModel(
                    self.model_name,
                    use_fp16=self.use_fp16  # Faster inference on CPU/GPU
                )
                logger.info("✅ BGE-M3 model loaded successfully")
                logger.info(f"   - Supports: Multi-lingual (Hindi + English)")
                logger.info(f"   - Context Length: 8192 tokens")
                logger.info(f"   - Embedding Dimension: {self.embedding_dim}")
                
            elif SENTENCE_TRANSFORMERS_AVAILABLE:
                logger.warning("BGE-M3 not available, falling back to sentence-transformers")
                # Fallback to a good sentence-transformer model
                fallback_model = "sentence-transformers/all-MiniLM-L6-v2"
                logger.info(f"Loading fallback model: {fallback_model}")
                self.model = SentenceTransformer(fallback_model)
                self.embedding_dim = self.model.get_sentence_embedding_dimension()
                logger.info(f"✅ Fallback model loaded (dim: {self.embedding_dim})")
            else:
                raise ImportError(
                    "No embedding libraries available. Install with:\n"
                    "pip install FlagEmbedding  # For BGE-M3 (recommended)\n"
                    "pip install sentence-transformers  # For fallback"
                )
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize embedding service: {e}")
            raise
    
    def embed(self, text: Union[str, List[str]], batch_size: int = 8) -> np.ndarray:
        """
        Generate embeddings for text(s) (MEMORY-OPTIMIZED).
        
        Args:
            text: Single text or list of texts
            batch_size: Batch size (REDUCED to 8 to prevent OOM)
            
        Returns:
            numpy array of embeddings (shape: [n_texts, embedding_dim])
        """
        if not self._initialized:
            self.initialize()
        
        # Convert single text to list
        is_single = isinstance(text, str)
        texts = [text] if is_single else text
        
        # Remove empty strings
        texts = [t if t else " " for t in texts]
        
        try:
            # Check if using BGE-M3 (check model class name instead of isinstance)
            if BGE_M3_AVAILABLE and hasattr(self.model, 'encode') and 'BGEM3' in str(type(self.model)):
                # BGE-M3 encoding (MEMORY-OPTIMIZED)
                result = self.model.encode(
                    texts,
                    batch_size=min(batch_size, 8),  # Cap at 8 for safety
                    max_length=4096,  # Reduced from 8192 to save RAM
                    return_dense=True,
                    return_sparse=False,
                    return_colbert_vecs=False
                )
                # BGE-M3 returns a dict with 'dense_vecs' key
                embeddings = result['dense_vecs'] if isinstance(result, dict) else result
                
            else:
                # Sentence-transformers encoding
                embeddings = self.model.encode(
                    texts,
                    batch_size=min(batch_size, 8),  # Cap at 8 for safety
                    show_progress_bar=False,
                    convert_to_numpy=True
                )
            
            # Return single embedding if input was single text
            if is_single:
                return embeddings[0]
            
            return embeddings
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            # Return zero vectors as fallback
            if is_single:
                return np.zeros(self.embedding_dim)
            return np.zeros((len(texts), self.embedding_dim))
    
    def embed_query(self, query: str) -> np.ndarray:
        """
        Generate embedding for a search query.
        Some models have different encoding for queries vs documents.
        
        Args:
            query: Search query text
            
        Returns:
            Query embedding vector
        """
        # For BGE-M3, queries and documents use the same encoding
        # But we could add query prefixes if needed in the future
        return self.embed(query)
    
    def embed_documents(self, documents: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Generate embeddings for documents.
        
        Args:
            documents: List of document texts
            batch_size: Batch size for processing
            
        Returns:
            Document embeddings (shape: [n_docs, embedding_dim])
        """
        return self.embed(documents, batch_size=batch_size)
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this model."""
        if not self._initialized:
            self.initialize()
        return self.embedding_dim


# Singleton instance
_embedding_service: EmbeddingService = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the singleton embedding service."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
        _embedding_service.initialize()
    return _embedding_service


if __name__ == "__main__":
    # Test the embedding service
    service = get_embedding_service()
    
    # Test English
    en_text = "What is the punishment for murder under IPC Section 302?"
    en_emb = service.embed_query(en_text)
    print(f"English embedding shape: {en_emb.shape}")
    
    # Test Hindi
    hi_text = "आईपीसी धारा 302 के तहत हत्या की सजा क्या है?"
    hi_emb = service.embed_query(hi_text)
    print(f"Hindi embedding shape: {hi_emb.shape}")
    
    # Test similarity
    similarity = np.dot(en_emb, hi_emb) / (np.linalg.norm(en_emb) * np.linalg.norm(hi_emb))
    print(f"Cross-lingual similarity: {similarity:.4f}")
    
    # Test batch
    docs = [
        "Section 302 IPC deals with punishment for murder",
        "Section 307 IPC deals with attempt to murder",
        "Section 304 IPC deals with culpable homicide"
    ]
    doc_embs = service.embed_documents(docs)
    print(f"Batch embeddings shape: {doc_embs.shape}")
