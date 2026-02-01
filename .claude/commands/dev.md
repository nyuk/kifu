# Start Development Servers

Start both frontend and backend development servers.

## Instructions

1. Start the frontend dev server:
   ```bash
   cd frontend && pnpm dev
   ```

2. Start the backend (in a separate terminal):
   ```bash
   cd backend && go run ./cmd/...
   ```

## Ports
- Frontend: http://localhost:5173
- Backend: Check backend configuration

## Notes
- Ensure `.env` files are configured before starting
- Frontend hot-reloads on file changes
