# NyayaShastra - Memory-Safe Startup Guide

## 🚨 CRITICAL: Prevent System Freezes

Your system froze because models loaded without memory limits. All fixes are now applied.

## ✅ What Was Fixed

1. **CPU-Only Mode**: Forced all models to use CPU (no GPU memory spikes)
2. **Reduced Batch Sizes**: From 32 → 8 (4x less RAM per batch)
3. **Smaller Context**: From 4096 → 2048 tokens (saves ~2GB)
4. **Single Worker**: Backend uses 1 worker (not multiple processes)
5. **Token Limits**: Max 512 tokens per response (prevents runaway generation)

## 📊 Expected RAM Usage

- **Idle**: ~2GB
- **Ollama loaded**: ~6-7GB (4-bit quantized model)
- **Backend started**: ~8-9GB (BGE-M3 + services)
- **During query**: ~10-12GB (peak usage)
- **Safe zone**: <14GB (with 2GB buffer)

## 🚀 Safe Startup Procedure

### Option 1: Setup Swap First (Recommended)

```bash
cd backend
./setup_swap.sh   # Creates 8GB swap space
```

Then start services:

```bash
# Terminal 1: Monitor RAM (keep this open!)
watch -n 1 free -h

# Terminal 2: Ollama (if not already running)
ollama serve

# Terminal 3: Backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --workers 1

# Terminal 4: Frontend
npm run dev
```

### Option 2: Use Safe Startup Script

```bash
cd backend
./start_safe.sh
```

This script:
- Checks swap space
- Verifies Ollama is running
- Starts backend with memory monitoring
- Alerts if RAM exceeds 14GB

## ⚠️ Emergency Recovery

If system freezes again:

1. **Emergency Terminal**: Press `CTRL + ALT + F2`
2. **Login** with your credentials
3. **Kill processes**:
   ```bash
   pkill -9 ollama
   pkill -9 python
   pkill -9 uvicorn
   ```
4. **Return to GUI**: Press `CTRL + ALT + F7`

## 🔍 Verify Models Are Quantized

```bash
# Check Ollama model
ollama show llama3:8b-instruct-q4_K_M | grep quantization
# Should show: quantization_level: Q4_K_M

# Check memory before starting
free -h

# Check after Ollama loads
free -h
# Should show ~6-7GB used
```

## 📌 Performance Notes

With these optimizations:
- **Startup time**: ~30-60 seconds (model loading)
- **Query latency**: 2-5 seconds (CPU inference)
- **Throughput**: ~10-15 tokens/sec (acceptable for chat)
- **Stability**: System should NOT freeze

## 🎯 Success Indicators

✅ Backend starts without freeze  
✅ RAM stays below 14GB  
✅ Queries return responses  
✅ System remains responsive  

If any of these fail, check the logs and RAM usage.
