#!/bin/bash

# NyayaShastra - Local Hybrid RAG Setup Script (MEMORY-SAFE)
# This script helps you set up the complete local RAG pipeline

set -e  # Exit on error

echo "============================================"
echo "🚀 NyayaShastra - Local Hybrid RAG Setup"
echo "============================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ Error: Please run this script from the backend/ directory${NC}"
    exit 1
fi

# Check available RAM
echo "Checking system resources..."
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
echo "System RAM: ${TOTAL_RAM}GB"

if [ "$TOTAL_RAM" -lt 12 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Low RAM detected (${TOTAL_RAM}GB)${NC}"
    echo "Recommended: 16GB+ for smooth operation"
    echo ""
    read -p "Continue anyway? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check swap space
SWAP=$(free -g | awk '/^Swap:/{print $2}')
if [ "$SWAP" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No swap space detected${NC}"
    echo "Would you like to create 8GB swap? (Recommended for stability)"
    read -p "(y/N): " create_swap
    if [[ "$create_swap" =~ ^[Yy]$ ]]; then
        chmod +x setup_swap.sh
        ./setup_swap.sh
    fi
fi

echo ""
echo "Step 1: Installing Python dependencies..."
echo "----------------------------------------"
pip install -r requirements.txt
echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo ""

echo "Step 2: Checking Ollama installation..."
echo "----------------------------------------"

if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✅ Ollama is installed${NC}"
    
    # Check if Ollama is running
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Ollama is not running${NC}"
        echo "Starting Ollama in the background..."
        ollama serve &> /tmp/ollama.log &
        sleep 5
        
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Ollama started successfully${NC}"
        else
            echo -e "${RED}❌ Failed to start Ollama${NC}"
            echo "Please start Ollama manually: ollama serve"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Ollama is not installed${NC}"
    echo ""
    echo "Please install Ollama:"
    echo "  Linux:   curl -fsSL https://ollama.ai/install.sh | sh"
    echo "  macOS:   brew install ollama"
    echo "  Windows: https://ollama.ai/download"
    echo ""
    read -p "Press Enter after installing Ollama..."
fi

echo ""
echo "Step 3: Downloading Llama-3-8B model..."
echo "----------------------------------------"

# Check if model is already downloaded
if ollama list | grep -q "llama3:8b-instruct-q4_K_M"; then
    echo -e "${GREEN}✅ Model already downloaded${NC}"
else
    echo "Downloading llama3:8b-instruct-q4_K_M (4-bit quantized, ~4.7GB)..."
    echo "This may take a few minutes..."
    ollama pull llama3:8b-instruct-q4_K_M
    echo -e "${GREEN}✅ Model downloaded${NC}"
fi

echo ""
echo "Step 4: Testing services..."
echo "----------------------------------------"

echo "Testing BGE-M3 embeddings..."
python -c "
from app.services.embedding_service import get_embedding_service
service = get_embedding_service()
emb = service.embed_query('test')
print(f'✅ Embedding service working (dim: {len(emb)})')
" || echo -e "${RED}❌ Embedding service failed${NC}"

echo ""
echo "Testing BGE-Reranker..."
python -c "
from app.services.reranker_service import get_reranker_service
service = get_reranker_service()
print('✅ Reranker service working')
" || echo -e "${YELLOW}⚠️  Reranker service failed (optional)${NC}"

echo ""
echo "Testing Ollama connection..."
python -c "
import asyncio
from app.services.ollama_service import is_ollama_available

async def test():
    result = await is_ollama_available()
    if result:
        print('✅ Ollama connection working')
    else:
        print('❌ Ollama connection failed')

asyncio.run(test())
" || echo -e "${RED}❌ Ollama connection failed${NC}"

echo ""
echo "============================================"
echo "✅ Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Ingest your PDF documents:"
echo "   python scripts/ingest_semantic.py"
echo ""
echo "2. Test the hybrid search:"
echo "   python app/services/hybrid_search_service.py"
echo ""
echo "3. Test the full pipeline:"
echo "   python app/services/enhanced_retriever_service.py"
echo ""
echo "4. Start your FastAPI server:"
echo "   uvicorn app.main:app --reload"
echo ""
echo "For detailed documentation, see:"
echo "   docs/HYBRID_RAG_ARCHITECTURE.md"
echo ""
