# Frontend (Next.js)

이 프론트엔드는 **Next.js App Router** 기준으로 동작합니다.

## Scripts

```bash
npm run dev      # http://localhost:5173
npm run build
npm run start
npm run lint
```

## Environment

`.env.example`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api
NEXT_PUBLIC_APP_MODE=prod
```

- `NEXT_PUBLIC_APP_MODE=demo`: Preview 데모 모드 (AI mock 응답)
- `NEXT_PUBLIC_APP_MODE=prod`: Production 모드 (실제 API 호출)

## Notes

- 이 프로젝트는 Vite를 사용하지 않습니다.
- 라우팅은 `app/` 디렉터리 기준으로 구성됩니다.
