# CLAUDE.md - Project Knowledge Base

> This file is the shared knowledge repository for Claude Code.
> Add rules here when Claude makes mistakes to prevent recurrence.

## Project Overview

**kifu** - Trading/Investment application with chart visualization and trade tracking.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand |
| Backend | Go 1.21, Fiber v2, PostgreSQL (pgx), JWT auth |
| Charts | lightweight-charts |

## Project Structure

```
kifu/
├── frontend/          # Next.js app (port 5173)
│   └── src/
│       ├── components/
│       ├── routes/
│       ├── stores/    # Zustand stores
│       └── lib/
├── backend/           # Go Fiber API
│   ├── cmd/
│   ├── internal/
│   └── migrations/
└── docs/              # Documentation (if exists)
```

## Development Commands

```bash
# Frontend
cd frontend && pnpm dev      # Start dev server (port 5173)
cd frontend && pnpm build    # Production build
cd frontend && pnpm lint     # Run ESLint

# Backend
cd backend && go run ./cmd/... # Start backend
cd backend && go build -o main ./cmd/...
```

## Coding Conventions

### TypeScript/React
- Prefer `type` over `interface`
- Never use `enum` → Use string literal unions
- Use functional components with hooks
- State management: Zustand only

### Go
- Follow standard Go conventions
- Use Fiber v2 patterns for handlers
- Database: pgx for PostgreSQL

### Testing
- Frontend: Vitest + React Testing Library
- Backend: Go standard testing package
- 테스트 파일명: `*.test.ts` (프론트), `*_test.go` (백엔드)
- 단위 테스트 우선, 필요시 통합 테스트 추가

### API Conventions
- RESTful 엔드포인트: `/api/v1/{resource}`
- 복수형 리소스명 사용: `/trades`, `/portfolios`
- 액션은 동사 사용: `/auth/login`, `/auth/logout`

### Error Handling
- Frontend: try-catch + toast 알림
- Backend: 표준 에러 응답 형식 사용
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input"
    }
  }
  ```

## Prohibited

- ❌ No `console.log` in production code (use proper logging)
- ❌ No `any` type in TypeScript
- ❌ No committing `.env` files
- ❌ No large context dumps to LLM (see important_rules.md)

## Token Optimization (from important_rules.md)

1. **Diff-based requests**: Send only changed parts + 20-40 surrounding lines
2. **Summarize logs**: Error 20 lines + previous 50 lines max
3. **Short output format**: Conclusion 5 lines + evidence 5 lines + checklist 5 items
4. **Local tools first**: Run `pnpm lint`, `go vet` before asking LLM

## References

- `SPEC.md` - Current objectives and scope
- `important_rules.md` - Multi-model token optimization playbook
- `QA_CHECKLIST.md` - QA verification checklist
