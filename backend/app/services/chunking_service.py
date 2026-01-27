"""
NyayaShastra - Semantic Chunking Service
Intelligent document chunking based on meaning, not just character count.
Preserves legal section boundaries and attaches metadata.
"""

import re
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import hashlib

logger = logging.getLogger(__name__)

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_experimental.text_splitter import SemanticChunker
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.warning("LangChain not available for semantic chunking")


class SemanticChunkingService:
    """
    Advanced chunking service that preserves semantic meaning.
    Uses embedding-based similarity to determine chunk boundaries.
    """
    
    def __init__(self, embedding_service=None):
        """
        Initialize semantic chunking service.
        
        Args:
            embedding_service: Embedding service for semantic similarity
        """
        self.embedding_service = embedding_service
        self._initialized = False
        
        # Legal section patterns
        self.section_patterns = [
            r'(?:Section|Sec\.?|धारा)\s+(\d+[A-Z]?)',  # Section 302, धारा 302
            r'(?:Article|अनुच्छेद)\s+(\d+[A-Z]?)',  # Article 21
            r'(?:Rule|नियम)\s+(\d+)',  # Rule 5
            r'(?:Chapter|अध्याय)\s+([IVX]+|\d+)',  # Chapter IV
        ]
        
    def extract_metadata_from_text(self, text: str) -> Dict[str, Any]:
        """
        Extract metadata from text (section numbers, act names, etc.).
        
        Args:
            text: Document text
            
        Returns:
            Dictionary of extracted metadata
        """
        metadata = {
            'sections': [],
            'act_name': None,
            'keywords': []
        }
        
        # Extract section numbers
        for pattern in self.section_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                metadata['sections'].extend(matches)
        
        # Remove duplicates
        metadata['sections'] = list(set(metadata['sections']))
        
        # Extract Act names (common patterns)
        act_patterns = [
            r'Indian Penal Code|IPC',
            r'Bharatiya Nyaya Sanhita|BNS',
            r'Code of Criminal Procedure|CrPC|BNSS',
            r'Constitution of India',
            r'Motor Vehicles Act|MVA',
            r'Information Technology Act|IT Act',
            r'Companies Act',
            r'Income Tax Act',
        ]
        
        for pattern in act_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                metadata['act_name'] = re.search(pattern, text, re.IGNORECASE).group(0)
                break
        
        return metadata
    
    def chunk_by_sections(
        self,
        text: str,
        max_chunk_size: int = 1000,
        overlap: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Chunk text by legal sections with smart overlap.
        Preserves section boundaries as much as possible.
        
        Args:
            text: Document text
            max_chunk_size: Maximum characters per chunk
            overlap: Overlap between chunks
            
        Returns:
            List of chunk dictionaries with content and metadata
        """
        chunks = []
        
        # Split by section headers
        section_pattern = r'((?:Section|Sec\.?|धारा|Article|अनुच्छेद)\s+\d+[A-Z]?[:\.\s])'
        parts = re.split(section_pattern, text, flags=re.IGNORECASE)
        
        current_chunk = ""
        current_section = None
        
        for i, part in enumerate(parts):
            # Check if this is a section header
            if re.match(section_pattern, part, re.IGNORECASE):
                current_section = part.strip()
                
                # If current chunk is too large, save it
                if len(current_chunk) > max_chunk_size:
                    if current_chunk.strip():
                        metadata = self.extract_metadata_from_text(current_chunk)
                        chunks.append({
                            'content': current_chunk.strip(),
                            'metadata': metadata,
                            'section': current_section
                        })
                    current_chunk = part
                else:
                    current_chunk += part
            else:
                current_chunk += part
                
                # If chunk exceeds max size, save it
                if len(current_chunk) > max_chunk_size:
                    if current_chunk.strip():
                        metadata = self.extract_metadata_from_text(current_chunk)
                        chunks.append({
                            'content': current_chunk.strip(),
                            'metadata': metadata,
                            'section': current_section
                        })
                    # Start new chunk with overlap
                    overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                    current_chunk = overlap_text
        
        # Add final chunk
        if current_chunk.strip():
            metadata = self.extract_metadata_from_text(current_chunk)
            chunks.append({
                'content': current_chunk.strip(),
                'metadata': metadata,
                'section': current_section
            })
        
        return chunks
    
    def chunk_semantic(
        self,
        text: str,
        breakpoint_threshold_type: str = "percentile",
        breakpoint_threshold_amount: float = 95
    ) -> List[Dict[str, Any]]:
        """
        Chunk text using semantic similarity (requires LangChain Experimental).
        Splits at points where meaning changes significantly.
        
        Args:
            text: Document text
            breakpoint_threshold_type: 'percentile', 'standard_deviation', or 'interquartile'
            breakpoint_threshold_amount: Threshold value
            
        Returns:
            List of semantically coherent chunks
        """
        if not LANGCHAIN_AVAILABLE or self.embedding_service is None:
            logger.warning("Semantic chunking not available, falling back to section-based chunking")
            return self.chunk_by_sections(text)
        
        try:
            # Create a wrapper for the embedding service
            class EmbeddingWrapper:
                def __init__(self, embedding_service):
                    self.embedding_service = embedding_service
                
                def embed_documents(self, texts: List[str]) -> List[List[float]]:
                    embeddings = self.embedding_service.embed_documents(texts)
                    return embeddings.tolist()
            
            embedding_wrapper = EmbeddingWrapper(self.embedding_service)
            
            # Create semantic chunker
            semantic_chunker = SemanticChunker(
                embedding_wrapper,
                breakpoint_threshold_type=breakpoint_threshold_type,
                breakpoint_threshold_amount=breakpoint_threshold_amount
            )
            
            # Split text
            chunks_text = semantic_chunker.split_text(text)
            
            # Create chunk dictionaries with metadata
            chunks = []
            for chunk_text in chunks_text:
                metadata = self.extract_metadata_from_text(chunk_text)
                chunks.append({
                    'content': chunk_text.strip(),
                    'metadata': metadata
                })
            
            logger.info(f"Created {len(chunks)} semantic chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"Semantic chunking failed: {e}")
            logger.warning("Falling back to section-based chunking")
            return self.chunk_by_sections(text)
    
    def chunk_document(
        self,
        text: str,
        strategy: str = "section",
        max_chunk_size: int = 1000,
        overlap: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Main entry point for document chunking.
        
        Args:
            text: Document text
            strategy: 'section' or 'semantic'
            max_chunk_size: Maximum characters per chunk (for section strategy)
            overlap: Overlap between chunks (for section strategy)
            
        Returns:
            List of chunk dictionaries
        """
        if not text or not text.strip():
            return []
        
        if strategy == "semantic":
            chunks = self.chunk_semantic(text)
        else:
            chunks = self.chunk_by_sections(text, max_chunk_size, overlap)
        
        # Add chunk IDs
        for i, chunk in enumerate(chunks):
            # Generate stable ID based on content
            content_hash = hashlib.md5(chunk['content'].encode()).hexdigest()[:8]
            chunk['chunk_id'] = f"chunk_{i}_{content_hash}"
            chunk['chunk_index'] = i
        
        return chunks
    
    def chunk_with_markdown_preservation(self, markdown_text: str) -> List[Dict[str, Any]]:
        """
        Chunk markdown text while preserving headers and structure.
        Useful for PDFs converted to markdown.
        
        Args:
            markdown_text: Markdown formatted text
            
        Returns:
            List of chunks preserving markdown structure
        """
        # Split by headers (##, ###, etc.)
        header_pattern = r'(^#{1,6}\s+.+$)'
        parts = re.split(header_pattern, markdown_text, flags=re.MULTILINE)
        
        chunks = []
        current_chunk = ""
        current_header = None
        
        for part in parts:
            if re.match(header_pattern, part):
                # Save previous chunk if it exists
                if current_chunk.strip():
                    metadata = self.extract_metadata_from_text(current_chunk)
                    metadata['header'] = current_header
                    chunks.append({
                        'content': current_chunk.strip(),
                        'metadata': metadata
                    })
                
                # Start new chunk with this header
                current_header = part.strip()
                current_chunk = part + "\n"
            else:
                current_chunk += part
        
        # Add final chunk
        if current_chunk.strip():
            metadata = self.extract_metadata_from_text(current_chunk)
            metadata['header'] = current_header
            chunks.append({
                'content': current_chunk.strip(),
                'metadata': metadata
            })
        
        # Add chunk IDs
        for i, chunk in enumerate(chunks):
            content_hash = hashlib.md5(chunk['content'].encode()).hexdigest()[:8]
            chunk['chunk_id'] = f"md_chunk_{i}_{content_hash}"
            chunk['chunk_index'] = i
        
        return chunks


def get_chunking_service(embedding_service=None) -> SemanticChunkingService:
    """Create a chunking service instance."""
    return SemanticChunkingService(embedding_service=embedding_service)


if __name__ == "__main__":
    # Test the chunking service
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
    
    print(f"Created {len(chunks)} chunks:")
    for chunk in chunks:
        print(f"\nChunk ID: {chunk['chunk_id']}")
        print(f"Sections: {chunk['metadata']['sections']}")
        print(f"Content: {chunk['content'][:100]}...")
