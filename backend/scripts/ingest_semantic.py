"""
NyayaShastra - Semantic PDF Ingestion Script (Phase 1: Better Input = Better Output)
- Converts PDFs to Markdown (preserves headers like ## Section 302)
- Uses Semantic Chunking (meaning-based, not just 1000 characters)
- Extracts metadata (Act Name, Section Number)
- Uses BGE-M3 for embeddings (Multi-lingual, 8k context)
- Stores in ChromaDB with rich metadata
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import List, Dict, Any
import pdfplumber

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def convert_pdf_to_markdown(pdf_path: Path) -> str:
    """
    Convert PDF to Markdown format, preserving structure.
    
    Args:
        pdf_path: Path to PDF file
        
    Returns:
        Markdown formatted text
    """
    markdown_parts = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if not text:
                    continue
                
                # Basic markdown conversion
                # Identify potential headers (lines that are short and in caps or start with numbers)
                lines = text.split('\n')
                processed_lines = []
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        processed_lines.append('')
                        continue
                    
                    # Check if line looks like a section header
                    if any(keyword in line.upper() for keyword in ['SECTION', 'CHAPTER', 'ARTICLE', 'PART']):
                        # Make it a markdown header
                        processed_lines.append(f"## {line}")
                    elif line.isupper() and len(line) < 100:
                        # Short uppercase lines are likely headers
                        processed_lines.append(f"### {line}")
                    else:
                        processed_lines.append(line)
                
                page_markdown = '\n'.join(processed_lines)
                markdown_parts.append(page_markdown)
        
        return '\n\n'.join(markdown_parts)
        
    except Exception as e:
        logger.error(f"Error converting PDF to markdown {pdf_path}: {e}")
        # Fallback to plain text
        return await extract_plain_text(pdf_path)


async def extract_plain_text(pdf_path: Path) -> str:
    """Fallback: Extract plain text from PDF."""
    text_parts = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        logger.error(f"Error extracting text from {pdf_path}: {e}")
    return "\n\n".join(text_parts)


def get_domain_from_path(pdf_path: Path) -> str:
    """
    Extract domain/category from folder structure.
    
    Args:
        pdf_path: Path to PDF file
        
    Returns:
        Domain name (e.g., 'Criminal', 'Traffic', etc.)
    """
    # Get parent folder name
    parent_folder = pdf_path.parent.name
    
    # Map folder names to domains
    domain_mapping = {
        'Criminal': 'criminal',
        'Traffic': 'traffic',
        'Civil_Family': 'civil_family',
        'Corporate': 'corporate',
        'IT_Cyber': 'it_cyber',
        'Property': 'property',
        'Constitutional': 'constitutional',
        'Consitutional': 'constitutional',  # Handle typo
        'Environment': 'environment',
    }
    
    return domain_mapping.get(parent_folder, 'general')


async def ingest_pdfs_semantic():
    """
    Main ingestion function using semantic chunking and BGE-M3 embeddings.
    """
    print("\n" + "="*80)
    print("🚀 SEMANTIC PDF INGESTION - Phase 1: Better Input = Better Output")
    print("="*80)
    
    try:
        # Import services
        from app.services.embedding_service import get_embedding_service
        from app.services.chunking_service import get_chunking_service
        import chromadb
        
        # Initialize services
        logger.info("Initializing embedding service (BGE-M3)...")
        embedding_service = get_embedding_service()
        
        logger.info("Initializing chunking service...")
        chunking_service = get_chunking_service(embedding_service)
        
        logger.info("Initializing ChromaDB...")
        chroma_client = chromadb.PersistentClient(
            path=str(Path(__file__).parent.parent / "chroma_db")
        )
        
        # Create or get collection with BGE-M3 embedding dimension
        collection = chroma_client.get_or_create_collection(
            name="legal_documents_semantic",
            metadata={
                "description": "Legal documents with semantic chunking and BGE-M3 embeddings",
                "embedding_model": "BAAI/bge-m3",
                "embedding_dimension": str(embedding_service.get_embedding_dimension()),
                "chunking_strategy": "semantic"
            }
        )
        
        # Get data directory
        data_dir = Path(__file__).parent.parent / "data"
        
        if not data_dir.exists():
            logger.error(f"Data directory not found: {data_dir}")
            return 0
        
        print(f"\n📂 Scanning directory: {data_dir}")
        
        # Find all PDFs
        pdf_files = list(data_dir.rglob("*.pdf"))
        
        if not pdf_files:
            logger.warning("No PDF files found")
            return 0
        
        print(f"📄 Found {len(pdf_files)} PDF files")
        print("\n" + "-"*80)
        
        total_chunks = 0
        domain_stats = {}
        
        for i, pdf_path in enumerate(pdf_files, 1):
            try:
                domain = get_domain_from_path(pdf_path)
                relative_path = pdf_path.relative_to(data_dir)
                
                print(f"\n[{i}/{len(pdf_files)}] Processing: {relative_path}")
                print(f"   Domain: {domain}")
                
                # Step 1: Convert PDF to Markdown
                print("   ➤ Converting to Markdown...")
                markdown_text = await convert_pdf_to_markdown(pdf_path)
                
                if not markdown_text or len(markdown_text) < 100:
                    logger.warning(f"   ⚠️  Skipping (insufficient text): {pdf_path.name}")
                    continue
                
                print(f"   ➤ Extracted {len(markdown_text)} characters")
                
                # Step 2: Semantic Chunking
                print("   ➤ Semantic chunking...")
                chunks = chunking_service.chunk_document(
                    markdown_text,
                    strategy="section",  # Use section-based for legal docs
                    max_chunk_size=1000,
                    overlap=100
                )
                
                if not chunks:
                    logger.warning(f"   ⚠️  No chunks created: {pdf_path.name}")
                    continue
                
                print(f"   ➤ Created {len(chunks)} semantic chunks")
                
                # Step 3: Generate embeddings and store
                print("   ➤ Generating BGE-M3 embeddings...")
                
                chunk_contents = [chunk['content'] for chunk in chunks]
                embeddings = embedding_service.embed_documents(chunk_contents)
                
                # Prepare data for ChromaDB
                ids = []
                documents = []
                metadatas = []
                embeddings_list = []
                
                for j, chunk in enumerate(chunks):
                    chunk_id = f"{pdf_path.stem}_{chunk['chunk_id']}"
                    ids.append(chunk_id)
                    documents.append(chunk['content'])
                    
                    # Clean metadata - ChromaDB doesn't accept None values
                    sections = chunk['metadata'].get('sections', [])
                    act_name = chunk['metadata'].get('act_name', '')
                    
                    metadata = {
                        'source': str(relative_path),
                        'domain': domain,
                        'chunk_index': chunk['chunk_index'],
                        'sections': ','.join(sections) if sections else '',
                        'act_name': act_name if act_name else '',
                        'filename': pdf_path.name,
                    }
                    metadatas.append(metadata)
                    embeddings_list.append(embeddings[j].tolist())
                
                # Add to ChromaDB
                collection.add(
                    ids=ids,
                    documents=documents,
                    embeddings=embeddings_list,
                    metadatas=metadatas
                )
                
                total_chunks += len(chunks)
                domain_stats[domain] = domain_stats.get(domain, 0) + len(chunks)
                
                print(f"   ✅ Indexed {len(chunks)} chunks")
                
            except Exception as e:
                logger.error(f"   ❌ Failed to process {pdf_path.name}: {e}")
                continue
        
        print("\n" + "="*80)
        print("✅ INGESTION COMPLETE")
        print("="*80)
        print(f"Total chunks indexed: {total_chunks}")
        print(f"Total documents processed: {len(pdf_files)}")
        print("\nDomain breakdown:")
        for domain, count in sorted(domain_stats.items()):
            print(f"  - {domain:20s}: {count:4d} chunks")
        print("="*80)
        
        return total_chunks
        
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        import traceback
        traceback.print_exc()
        return 0


if __name__ == "__main__":
    result = asyncio.run(ingest_pdfs_semantic())
    print(f"\n🎉 Successfully ingested {result} semantic chunks")
