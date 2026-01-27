#!/bin/bash

# NyayaShastra - One-Command Startup Script
# This starts all required services in the correct order

set -e

echo "============================================"
echo "🚀 Starting NyayaShastra System"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "Project root: $PROJECT_ROOT"
echo ""

# Check if first-time setup is needed
if [ ! -d "$BACKEND_DIR/chroma_db/legal_documents_semantic" ]; then
    echo -e "${YELLOW}⚠️  First-time setup required!${NC}"
    echo ""
    echo "Please run these commands first:"
    echo "  1. cd backend"
    echo "  2. ./setup_hybrid_rag.sh"
    echo "  3. python scripts/ingest_semantic.py"
    echo ""
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Step 1: Check Ollama
echo "Step 1: Checking Ollama..."
echo "-------------------------------------------"

if ! command -v ollama &> /dev/null; then
    echo -e "${RED}❌ Ollama not installed!${NC}"
    echo "Install with: curl -fsSL https://ollama.ai/install.sh | sh"
    exit 1
fi

# Check if Ollama is already running
if check_port 11434; then
    echo -e "${GREEN}✅ Ollama is already running${NC}"
else
    echo "Starting Ollama server..."
    ollama serve &> /tmp/ollama.log &
    OLLAMA_PID=$!
    sleep 5
    
    if check_port 11434; then
        echo -e "${GREEN}✅ Ollama started (PID: $OLLAMA_PID)${NC}"
    else
        echo -e "${RED}❌ Failed to start Ollama${NC}"
        exit 1
    fi
fi

echo ""

# Step 2: Start Backend
echo "Step 2: Starting FastAPI Backend..."
echo "-------------------------------------------"

if check_port 8000; then
    echo -e "${YELLOW}⚠️  Port 8000 is already in use${NC}"
    echo "Backend may already be running, or another service is using the port"
else
    echo "Starting backend server..."
    cd "$BACKEND_DIR"
    uvicorn app.main:app --host 0.0.0.0 --port 8000 &> /tmp/fastapi.log &
    BACKEND_PID=$!
    sleep 3
    
    if check_port 8000; then
        echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
        echo -e "${GREEN}   API: http://localhost:8000${NC}"
        echo -e "${GREEN}   Docs: http://localhost:8000/docs${NC}"
    else
        echo -e "${RED}❌ Failed to start backend${NC}"
        echo "Check logs: tail -f /tmp/fastapi.log"
        exit 1
    fi
fi

echo ""

# Step 3: Start Frontend
echo "Step 3: Starting Frontend..."
echo "-------------------------------------------"

if check_port 5173; then
    echo -e "${YELLOW}⚠️  Port 5173 is already in use${NC}"
    echo "Frontend may already be running"
else
    cd "$PROJECT_ROOT"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies (first time only)..."
        npm install
    fi
    
    echo "Starting frontend dev server..."
    npm run dev &> /tmp/frontend.log &
    FRONTEND_PID=$!
    sleep 5
    
    if check_port 5173; then
        echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
        echo -e "${GREEN}   URL: http://localhost:5173${NC}"
    else
        echo -e "${RED}❌ Failed to start frontend${NC}"
        echo "Check logs: tail -f /tmp/frontend.log"
        exit 1
    fi
fi

echo ""
echo "============================================"
echo "✅ All Services Running!"
echo "============================================"
echo ""
echo "Access your application:"
echo "  🌐 Frontend:  http://localhost:5173"
echo "  📡 Backend:   http://localhost:8000"
echo "  📚 API Docs:  http://localhost:8000/docs"
echo "  🤖 Ollama:    http://localhost:11434"
echo ""
echo "Logs:"
echo "  Ollama:   tail -f /tmp/ollama.log"
echo "  Backend:  tail -f /tmp/fastapi.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo ""
echo "To stop all services:"
echo "  ./stop.sh"
echo ""
echo "Press Ctrl+C to stop (then run ./stop.sh to cleanup)"
echo "============================================"

# Keep script running and show combined logs
trap 'echo ""; echo "Stopping services..."; ./stop.sh; exit' INT TERM

# Follow logs
tail -f /tmp/ollama.log /tmp/fastapi.log /tmp/frontend.log
