# NYAYASHASTRA - Quick Start Commands

.PHONY: help install dev build start stop restart logs clean test deploy

help: ## Show this help message
	@echo "NYAYASHASTRA - Available Commands"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development Commands
install: ## Install all dependencies (backend + frontend)
	@echo "📦 Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "📦 Installing frontend dependencies..."
	npm install
	@echo "✅ Installation complete!"

dev: ## Start development servers (backend + frontend)
	@echo "🚀 Starting development servers..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@make -j2 dev-backend dev-frontend

dev-backend: ## Start backend only
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start frontend only
	npm run dev

# Docker Commands
docker-build: ## Build Docker images
	docker-compose build

docker-up: ## Start Docker containers (production mode)
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "Frontend: http://localhost"
	@echo "Backend: http://localhost:8000"

docker-dev: ## Start Docker containers (development mode with logs)
	docker-compose up

docker-down: ## Stop Docker containers
	docker-compose down

docker-restart: ## Restart Docker containers
	docker-compose restart

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-clean: ## Remove Docker containers and volumes
	docker-compose down -v
	@echo "✅ Cleaned up!"

# Build Commands
build: ## Build for production
	@echo "🏗️  Building frontend..."
	npm run build
	@echo "✅ Build complete! Files in dist/"

build-dev: ## Build for development
	npm run build:dev

# Testing
test: ## Run all tests
	@echo "🧪 Running backend tests..."
	cd backend && pytest
	@echo "🧪 Running frontend tests..."
	npm run test

test-backend: ## Run backend tests only
	cd backend && pytest

test-frontend: ## Run frontend tests only
	npm run test

# Database Commands
db-migrate: ## Run database migrations
	cd backend && alembic upgrade head

db-seed: ## Seed database with initial data
	cd backend && python app/seed_database.py

# Data Ingestion
ingest-data: ## Ingest legal documents into vector database
	cd backend && python scripts/ingest_hybrid.py

# Utility Commands
lint: ## Run linters
	npm run lint
	cd backend && pylint app/

format: ## Format code
	npm run format
	cd backend && black app/

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf node_modules/
	rm -rf backend/__pycache__/
	rm -rf backend/app/__pycache__/
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	@echo "✅ Cleaned!"

# Deployment
deploy: ## Deploy using deployment script
	./deploy.sh

deploy-railway: ## Deploy to Railway
	railway up

deploy-render: ## Deploy to Render
	@echo "Follow instructions at: https://render.com"
	@echo "See DEPLOYMENT.md for details"

# Status
status: ## Show service status
	@echo "Docker Status:"
	docker-compose ps
	@echo ""
	@echo "Backend Health:"
	@curl -s http://localhost:8000/health || echo "❌ Backend not running"
	@echo ""
	@echo "Frontend Status:"
	@curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend not running"

# Environment
env-setup: ## Create .env file from template
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ .env file created from template"; \
		echo "⚠️  Edit .env and add your API keys"; \
	else \
		echo "⚠️  .env file already exists"; \
	fi

# Documentation
docs: ## Open documentation
	@echo "📚 Opening documentation..."
	@xdg-open README.md 2>/dev/null || open README.md 2>/dev/null || start README.md

api-docs: ## Open API documentation
	@echo "📚 Opening API docs..."
	@xdg-open http://localhost:8000/docs 2>/dev/null || open http://localhost:8000/docs 2>/dev/null || start http://localhost:8000/docs
