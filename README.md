# CalAI - Nutrition Tracking & AI Assistant

A full-stack calorie tracking application with an AI chatbot combining Qdrant-backed
food search, an Ollama LLM, and a vision model for food-photo analysis.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MySQL
- **AI service (Cal-AI)**: Python + FastAPI, using Qdrant (vector search) + Ollama (LLM & vision)

## Architecture

```
Frontend (Vite, :3001)
      │  /api  (proxied)
      ▼
Backend (Node/Express, :3000) ──────► Cal-AI (FastAPI, :8000)
      │                                     │
      ▼                                     ├─► Qdrant (vector DB, food search)
   MySQL                                    └─► Ollama (:11434) — LLM + vision model
```

The chat and food-scan features call the backend, which forwards AI requests to the
Cal-AI Python service (`CAL_AI_BASE_URL`). Cal-AI searches Qdrant for nutrition data and
uses Ollama for language/vision responses.

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- Python 3.10+ (for the Cal-AI service)
- [Ollama](https://ollama.com/) installed and running (used by Cal-AI as the LLM backend)
- A Qdrant instance (cloud or self-hosted) for food search

## Setup

### 1. Database

```sql
CREATE DATABASE calai;
```

Run the schema file:

```bash
mysql -u root -p calai < backend/schema.sql
```

### 2. Backend

```bash
cd backend
# Create a .env file (there is no .env.example) — see "Environment Variables" below
npm install
npm run dev
```

The API runs on `http://localhost:3000`.

### 3. Ollama (required by Cal-AI)

Make sure Ollama is running, then pull the models configured in `Cal-AI/.env`
(`LLM_MODEL` and `VISION_MODEL`). For example:

```bash
ollama pull qcwind/qwen2.5-7B-instruct-Q4_K_M:latest   # LLM_MODEL
ollama pull qwen2.5vl:3b                                # VISION_MODEL (food photos)
```

### 4. Cal-AI Python service (required for chat & food scan)

```bash
cd Cal-AI
pip install -r requirements.txt
# Create a .env file with Qdrant + Ollama + Redis settings — see below
python -m uvicorn api.main:app --reload --port 8000
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3001

## Project Structure

```
backend/src/
├── chat/
│   ├── controllers/chat.controller.ts
│   ├── routes/chat.routes.ts
│   └── services/chat.service.ts     # Chat session/message logic + Cal-AI calls
├── auth/                            # Authentication (JWT)
├── user/                            # User management
├── admin/                           # Admin panel
├── notifications/                   # Email + scheduled notification jobs
├── shared/database/db.ts            # MySQL connection pool
├── app.ts                           # Express app setup
└── server.ts                        # Entry point

Cal-AI/                              # Python FastAPI service
├── api/
│   ├── main.py                      # FastAPI app (/health, /search, /query + routers)
│   └── routes/                      # food_analysis, qa, recipe_dataset, agentic_rag
└── core/
    ├── agent/                       # Data agent (search/compute/chart tools)
    ├── embedding/clip_service.py    # CLIP embeddings
    └── services/
        ├── retrieval/qdrant_service.py  # Qdrant vector search
        └── llm/llm_service.py           # LLM service (Ollama)
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3000 | Backend server port |
| `BASE_URL` | http://localhost:3000 | Public base URL (used in emails/links) |
| `DB_HOST` | localhost | MySQL host |
| `DB_PORT` | 3306 | MySQL port |
| `DB_USER` | root | MySQL user |
| `DB_PASSWORD` | - | MySQL password |
| `DB_NAME` | calai | Database name |
| `CAL_AI_BASE_URL` | http://localhost:8000 | Cal-AI Python service URL |
| `JWT_SECRET` | - | JWT signing secret |
| `JWT_EXPIRES_IN` | 7d | JWT expiry |
| `SMTP_USER` | - | SMTP username (notification emails) |
| `SMTP_PASS` | - | SMTP password |
| `SMTP_FROM` | - | Sender address for emails |

### Cal-AI service (`Cal-AI/.env`)

| Variable | Example | Description |
|---|---|---|
| `QDRANT_URL` | https://...qdrant.io | Qdrant endpoint |
| `QDRANT_API_KEY` | - | Qdrant API key |
| `LLM_BACKEND` | ollama | LLM backend |
| `LLM_API_URL` | http://localhost:11434/api/generate | Ollama generate endpoint |
| `LLM_MODEL` | qcwind/qwen2.5-7B-instruct-Q4_K_M:latest | Chat model |
| `VISION_MODEL` | qwen2.5vl:3b | Food-photo vision model |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | - | Redis cache |
