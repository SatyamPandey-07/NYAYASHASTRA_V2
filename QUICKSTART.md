# ⚡ NYAYASHASTRA - 5-Minute Quick Start

Get NYAYASHASTRA running in 5 minutes or less!

---

## 🎯 Fastest Way (Docker) - 2 Minutes

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- Git installed

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/SatyamPandey-07/NYAYASHASTRA.git
cd NYAYASHASTRA

# 2. Run the deployment script (Windows)
.\deploy.ps1

# OR for Mac/Linux
chmod +x deploy.sh
./deploy.sh

# 3. Select option 2 (Production mode)
# Wait for Docker to build and start (1-2 minutes)

# 4. Open your browser
# Frontend: http://localhost
# Backend: http://localhost:8000/docs
```

**That's it!** 🎉

---

## 🛠️ Manual Setup - 10 Minutes

### Prerequisites
- Python 3.10+ installed
- Node.js 18+ installed
- Git installed

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
.\venv\Scripts\activate.bat
# Mac/Linux:
source venv/bin/activate

# 4. Install dependencies (2-3 minutes)
pip install -r requirements.txt

# 5. Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend running at:** http://localhost:8000

### Frontend Setup (New Terminal)

```bash
# 1. Go back to project root
cd ..

# 2. Install dependencies (1-2 minutes)
npm install

# 3. Start development server
npm run dev
```

**Frontend running at:** http://localhost:5173

---

## 🔑 API Keys (Optional but Recommended)

For AI features to work, you need at least one API key:

### Option 1: Groq (FREE & FAST) ⭐ Recommended
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free)
3. Create API key
4. Add to `.env`: `GROQ_API_KEY=gsk_...`

### Option 2: OpenAI (Paid)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

### Option 3: Local LLM (Free but slower)
1. Install [Ollama](https://ollama.ai)
2. Run: `ollama pull llama3`
3. In `.env`: `USE_LOCAL_LLM=true`

**Update .env file:**
```bash
# Copy template
cp .env.example .env

# Edit .env and add your API key
# Windows: notepad .env
# Mac/Linux: nano .env
```

---

## ✅ Verify Installation

### Check Backend
```bash
# Health check
curl http://localhost:8000/health

# Expected: {"status": "healthy"}
```

### Check Frontend
Open browser: http://localhost:5173  
You should see the NYAYASHASTRA landing page.

### Check API Docs
Open: http://localhost:8000/docs  
You should see interactive API documentation.

---

## 🚀 First Query

1. Open http://localhost:5173
2. Click "Get Started" or "Sign In"
3. Select legal domain (e.g., "Criminal")
4. Ask a question: "What is Section 302 IPC?"
5. Get AI-powered legal answer with citations!

---

## 📋 Common Commands

### Using Docker

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Rebuild
docker-compose up -d --build
```

### Using Manual Setup

```bash
# Backend (in backend/ directory)
uvicorn app.main:app --reload

# Frontend (in root directory)
npm run dev

# Build for production
npm run build
```

### Using Makefile (Mac/Linux/WSL)

```bash
# Install dependencies
make install

# Start development
make dev

# Start with Docker
make docker-up

# View all commands
make help
```

### Using PowerShell Script (Windows)

```powershell
# Run deployment script
.\deploy.ps1

# Choose option:
# 1 - Development mode
# 2 - Production mode
# 3 - Stop services
# 4 - View logs
# 5 - Rebuild
# 6 - Open in browser
```

---

## 🐛 Troubleshooting

### "Port already in use"
```bash
# Backend (port 8000)
# Windows: netstat -ano | findstr :8000
# Mac/Linux: lsof -i :8000
# Kill the process and restart

# Frontend (port 5173, 80)
# Change port in vite.config.ts or docker-compose.yml
```

### "Module not found"
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
npm install
```

### "Docker build fails"
```bash
# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

### "Database error"
```bash
# Reset database
cd backend
rm nyayguru.db
python app/seed_database.py
```

### "Frontend can't connect to backend"
```bash
# Check VITE_API_URL in .env
# Should be: http://localhost:8000

# Check backend CORS settings
# Should include your frontend URL
```

---

## 📚 Next Steps

1. **Read Documentation**
   - [README.md](README.md) - Full project overview
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
   - [backend/README.md](backend/README.md) - Backend details

2. **Configure Authentication**
   - Get Clerk API key from [clerk.com](https://clerk.com)
   - Add to `.env`: `VITE_CLERK_PUBLISHABLE_KEY=pk_...`

3. **Load Legal Data**
   ```bash
   cd backend
   python scripts/ingest_data.py
   ```

4. **Customize**
   - Update branding in `src/components/Header.tsx`
   - Modify domains in `src/components/DomainSelection.tsx`
   - Add legal documents to `backend/data/`

5. **Deploy to Production**
   - See [DEPLOYMENT.md](DEPLOYMENT.md)
   - Options: Railway, Render, Vercel, DigitalOcean, AWS

---

## 🎓 Learn More

- **Multi-Agent Architecture:** [docs/HYBRID_RAG_ARCHITECTURE.md](docs/HYBRID_RAG_ARCHITECTURE.md)
- **Booking Feature:** [docs/BOOKING_FEATURE.md](docs/BOOKING_FEATURE.md)
- **API Reference:** http://localhost:8000/docs (when running)

---

## 💡 Tips

- Use **Groq API** for fastest responses (free tier)
- Use **Docker** for easiest setup
- Use **Railway** for easiest cloud deployment
- Add legal PDFs to `backend/data/` for custom knowledge base
- Enable Redis caching for better performance

---

## ❓ Still Stuck?

1. Check [GitHub Issues](https://github.com/SatyamPandey-07/NYAYASHASTRA/issues)
2. Read [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
3. Verify all prerequisites are installed
4. Try Docker method if manual setup fails

---

**Happy Legal AI! ⚖️**

Need help? Open an issue on GitHub!
