# 🚀 NYAYASHASTRA Deployment Guide

Complete guide to deploy NYAYASHASTRA (Legal AI Assistant) to production.

---

## 📋 Table of Contents
1. [Docker Deployment (Easiest)](#docker-deployment)
2. [Cloud Platform Deployment](#cloud-platforms)
3. [Manual Deployment](#manual-deployment)
4. [Environment Variables](#environment-variables)

---

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- Docker & Docker Compose installed
- Git installed

### Quick Start

```bash
# Clone repository
git clone https://github.com/SatyamPandey-07/NYAYASHASTRA.git
cd NYAYASHASTRA

# Create environment file
cp .env .env.local
# Edit .env.local with your configuration

# Build and run
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Access:**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Stop Services
```bash
docker-compose down
```

### Rebuild After Changes
```bash
docker-compose up -d --build
```

---

## ☁️ Cloud Platform Deployment

### Option 1: Railway.app (Easiest)

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `NYAYASHASTRA` repository
4. Railway auto-detects services
5. Add environment variables in Railway dashboard
6. Deploy automatically starts

**Cost:** Free tier available, ~$5-20/month for production

---

### Option 2: Render.com

**Backend:**
1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

**Frontend:**
1. New → Static Site
2. Connect same repo
3. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add environment variables
5. Deploy

**Cost:** Free tier available, ~$7/month for paid services

---

### Option 3: Vercel (Frontend) + Render/Railway (Backend)

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Backend:** Use Render or Railway (see above)

**Cost:** Vercel free for frontend, backend depends on choice

---

### Option 4: DigitalOcean App Platform

1. Go to [DigitalOcean](https://cloud.digitalocean.com/apps)
2. Create App → GitHub
3. Select repository
4. Configure components:
   - **Backend:** Python app (detects FastAPI)
   - **Frontend:** Static site (detects Vite)
5. Add environment variables
6. Deploy

**Cost:** $5-12/month per component

---

### Option 5: AWS ECS/Fargate

```bash
# Install AWS CLI
aws configure

# Build and push images
docker build -t nyayashastra-backend ./backend
docker build -t nyayashastra-frontend .

# Tag and push to ECR
aws ecr create-repository --repository-name nyayashastra-backend
aws ecr create-repository --repository-name nyayashastra-frontend

# Deploy to ECS (requires task definitions)
# See AWS ECS documentation for detailed steps
```

**Cost:** Pay-as-you-go, typically $10-50/month

---

## 🛠️ Manual Deployment

### Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run with Gunicorn (production)
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend (React/Vite)

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Serve with a static server
npm install -g serve
serve -s dist -l 80
```

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Backend
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name nyayashastra-backend

# Frontend
pm2 serve dist 80 --name nyayashastra-frontend --spa

# Save configuration
pm2 save
pm2 startup
```

---

## 🔐 Environment Variables

### Backend (.env)

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=https://your-frontend-url.com

# Database
DATABASE_URL=sqlite:///./nyayguru.db
# For PostgreSQL: postgresql://user:pass@host:5432/dbname

# Vector Database
CHROMA_PERSIST_DIR=./chroma_db
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

# AI/LLM (Choose one)
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# Local LLM (Optional)
USE_LOCAL_LLM=false
LOCAL_LLM_ENDPOINT=http://localhost:11434/api

# Security
SECRET_KEY=your-secret-key-here-min-32-chars
```

### Frontend (.env)

```bash
VITE_API_URL=https://your-backend-url.com
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

---

## 📊 Performance Optimization

### Production Checklist

- [ ] Set `API_DEBUG=false`
- [ ] Use production database (PostgreSQL recommended)
- [ ] Enable Redis caching (`USE_CACHE=true`)
- [ ] Configure rate limiting
- [ ] Set up SSL/TLS certificates
- [ ] Enable CDN for static assets
- [ ] Configure monitoring (Sentry, DataDog, etc.)
- [ ] Set up backup strategy
- [ ] Configure log aggregation

### Recommended Resources

**Minimum:**
- CPU: 1 vCPU
- RAM: 2 GB
- Storage: 10 GB

**Recommended:**
- CPU: 2 vCPUs
- RAM: 4 GB
- Storage: 20 GB SSD

---

## 🔍 Monitoring & Logs

### Docker Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Health Checks
- Backend: `http://your-backend-url/health`
- Frontend: Check if site loads

---

## 🆘 Troubleshooting

### Backend won't start
- Check environment variables
- Verify database connection
- Check port availability: `netstat -ano | findstr :8000`

### Frontend can't connect to backend
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is running

### Docker issues
```bash
# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 📞 Support

For deployment issues:
- Check logs first
- Review environment variables
- Verify network connectivity
- Open GitHub issue if needed

---

## 📝 Quick Reference

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|----------|
| Docker (Local) | Easy | Free | Development/Testing |
| Railway.app | Very Easy | $5-20/mo | Quick production deploy |
| Render.com | Easy | Free-$7/mo | Budget-friendly |
| Vercel + Render | Easy | Free-$7/mo | Scalable apps |
| DigitalOcean | Medium | $10-25/mo | Full control |
| AWS ECS | Hard | $15-50/mo | Enterprise scale |

---

**Recommended for beginners:** Railway.app or Render.com  
**Recommended for production:** Docker + DigitalOcean/AWS  
**Recommended for rapid testing:** Docker Compose locally

---

© 2026 NYAYASHASTRA | Legal AI Assistant for India 🇮🇳
