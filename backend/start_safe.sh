#!/bin/bash

# NyayaShastra - SAFE Startup with Memory Monitoring
# Prevents system freezes by monitoring RAM usage

echo "============================================"
echo "🚀 NyayaShastra - MEMORY-SAFE Startup"
echo "============================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check RAM
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
USED_RAM=$(free -g | awk '/^Mem:/{print $3}')
echo "RAM: ${USED_RAM}GB / ${TOTAL_RAM}GB used"

# Check swap
SWAP=$(free -g | awk '/^Swap:/{print $2}')
if [ "$SWAP" -eq 0 ]; then
    echo -e "${RED}⚠️  No swap space! Run: ./setup_swap.sh${NC}"
    exit 1
fi

echo ""
echo "Step 1: Checking Ollama..."
echo "-------------------------------------------"

if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${RED}❌ Ollama not running${NC}"
    echo "Start Ollama first: ollama serve"
    exit 1
fi

echo -e "${GREEN}✅ Ollama is running${NC}"

# Verify quantized model
MODEL_INFO=$(ollama show llama3:8b-instruct-q4_K_M 2>/dev/null | grep -i "quantization" || echo "")
if [ -z "$MODEL_INFO" ]; then
    echo -e "${YELLOW}⚠️  Model may not be quantized${NC}"
fi

echo ""
echo "Step 2: Starting Backend..."
echo "-------------------------------------------"
echo "RAM will be monitored. System will alert if >14GB used."
echo ""

cd "$(dirname "$0")/backend"

# Start uvicorn with single worker
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --workers 1 &
BACKEND_PID=$!

# Monitor memory in background
while kill -0 $BACKEND_PID 2>/dev/null; do
    sleep 5
    USED=$(free -g | awk '/^Mem:/{print $3}')
    if [ "$USED" -gt 14 ]; then
        echo -e "${RED}⚠️  HIGH MEMORY: ${USED}GB! Consider restarting${NC}"
    fi
done

wait $BACKEND_PID
