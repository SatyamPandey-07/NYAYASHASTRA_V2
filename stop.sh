#!/bin/bash

# NyayaShastra - Stop Script
# Stops all running services

echo "============================================"
echo "🛑 Stopping NyayaShastra Services"
echo "============================================"
echo ""

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    
    PID=$(lsof -ti:$port)
    if [ ! -z "$PID" ]; then
        kill $PID 2>/dev/null
        sleep 2
        # Force kill if still running
        if ps -p $PID > /dev/null 2>&1; then
            kill -9 $PID 2>/dev/null
        fi
        echo "✅ Stopped $name (port $port)"
    else
        echo "⚪ $name was not running (port $port)"
    fi
}

# Stop services
kill_port 11434 "Ollama"
kill_port 8000 "Backend"
kill_port 5173 "Frontend"

# Kill any remaining ollama processes
pkill -f "ollama serve" 2>/dev/null

# Kill any remaining uvicorn processes
pkill -f "uvicorn app.main:app" 2>/dev/null

# Kill any remaining vite processes
pkill -f "vite" 2>/dev/null

echo ""
echo "============================================"
echo "✅ All services stopped"
echo "============================================"
