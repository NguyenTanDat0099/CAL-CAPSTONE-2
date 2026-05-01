# CalAI - Nutrition Tracking & AI Assistant

A full-stack calorie tracking application with a Cal-AI Agentic RAG backend for food search, image analysis, and nutrition chat.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MySQL
- **AI**: CalAI Python Agentic RAG (Qdrant + Ollama served inside Cal-AI)

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- [Ollama](https://ollama.com/) installed and running
- [CalAI Python backend](Cal-AI/) for Agentic RAG and food image analysis

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
cp .env.example .env
# Edit .env with your MySQL credentials
npm install
npm run dev
```

### 3. Ollama (required)

Make sure Ollama is running and pull the models configured by `Cal-AI/config/settings.py`.

```bash
ollama pull qwen2.5vl:3b
ollama pull qcwind/qwen2.5-7B-instruct-Q4_K_M:latest
```

### 4. CalAI Python Backend

For Agentic RAG and food nutrition search powered by Qdrant:

```bash
cd Cal-AI
pip install -r requirements.txt
# Edit .env with Qdrant URL if needed
python -m uvicorn api.main:app --reload
```

The backend calls Cal-AI as the single AI entrypoint.

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
│   ├── services/
│   │   └── chat.service.ts         # Chat session/message logic + Cal-AI adapter
├── auth/                           # Authentication (JWT)
├── user/                           # User management
├── admin/                          # Admin panel
├── shared/database/db.ts           # MySQL connection pool
└── server.ts                       # Entry point

Cal-AI/                             # Python AI backend
├── api/main.py                     # FastAPI app with Agentic RAG, QA, recipe, food image routes
├── core/
│   ├── agent/agentic_rag.py        # Agentic RAG router/retriever/response generator
│   ├── services/retrieval/         # Qdrant vector search
│   ├── services/vision/            # Qwen-VL image analysis
│   └── prompts/                    # Shared prompts for text and image models
```

## AI Architecture

The chatbot uses a **single Agentic RAG approach**:

1. User sends a message
2. Backend calls Cal-AI (`/api/agent/query` for text or `/api/food/analyze` for images)
3. Cal-AI routes intent, retrieves Qdrant context, and uses the shared response prompt
4. The answer is returned directly to the user with trace and citations when available

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3000 | Backend server port |
| `DB_HOST` | localhost | MySQL host |
| `DB_PORT` | 3306 | MySQL port |
| `DB_USER` | root | MySQL user |
| `DB_PASSWORD` | - | MySQL password |
| `DB_NAME` | calai | Database name |
| `CAL_AI_BASE_URL` | http://localhost:8000 | CalAI Python agent URL |
| `OLLAMA_BASE_URL` | http://localhost:11434 | Ollama server URL used by Cal-AI |
| `JWT_SECRET` | - | JWT signing secret |
| `JWT_EXPIRES_IN` | 7d | JWT expiry |
