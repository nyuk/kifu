# Kifu - Trading Journal System

Cryptocurrency trading journal with chart annotations, AI opinions, and outcome tracking.

## Tech Stack
- **Backend**: Go + Fiber (Port 8080)
- **Frontend**: Next.js + Tailwind CSS (Port 5173)
- **Database**: PostgreSQL (Docker)
- **AI**: OpenAI + Claude + Gemini

## Quick Start
...
### Backend
```bash
cd kifu/backend
cp .env.example .env
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

## Development
- Backend: http://localhost:8080
- Frontend: http://localhost:5173
- PostgreSQL: localhost:5432
