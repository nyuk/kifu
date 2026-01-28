# Kifu - Trading Journal System

Cryptocurrency trading journal with chart annotations, AI opinions, and outcome tracking.

## Tech Stack
- Backend: Go + Fiber
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL
- AI: OpenAI + Claude + Gemini

## Quick Start

### Backend
```bash
cd kifu/backend
cp .env.example .env
# Edit .env with your keys
go mod download
go run cmd/main.go
```

### Frontend
```bash
cd kifu/frontend
cp .env.example .env
npm install
npm run dev
```

### Database
```bash
docker compose -f kifu/docker-compose.yml up -d
```

## Development
- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- PostgreSQL: localhost:5432
