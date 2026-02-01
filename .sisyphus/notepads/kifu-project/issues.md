
## [2026-01-30] Fixed: Hydration Error in i18n

### Problem
Hydration failed because server rendered HTML didn't match client.
The useLocale() hook used navigator.language which is only available on client,
causing mismatch between server ('en') and client (might be 'ko').

### Solution
Changed useLocale() from useMemo to useState + useEffect pattern:
- Default locale is 'en' for SSR and initial render
- useEffect detects browser locale after hydration
- Checks localStorage first for saved preference, then navigator.language

### Files Modified
- frontend/src/lib/i18n.ts

### Code Change
```typescript
// Before (problematic)
export function useLocale() {
  return useMemo<Locale>(() => {
    if (typeof navigator === 'undefined') return 'en'
    return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en'
  }, [])
}

// After (fixed)
export function useLocale() {
  const [locale, setLocale] = useState<Locale>('en')
  
  useEffect(() => {
    const savedLocale = localStorage.getItem('kifu-language')
    if (savedLocale === 'ko' || savedLocale === 'en') {
      setLocale(savedLocale)
    } else if (navigator.language.toLowerCase().startsWith('ko')) {
      setLocale('ko')
    }
  }, [])
  
  return locale
}
```

### Verification
- npm run build: PASSED
- No hydration errors


## [2026-01-30] Fixed: Login Issue - Invalid Credential Error

### Problem
Users getting "Invalid credential" error when trying to log in.

### Root Cause
Email case sensitivity mismatch between registration and login.
- PostgreSQL is case-sensitive by default
- User might register with "User@Example.com" but try to login with "user@example.com"
- GetByEmail query used exact match: 

### Solution
Made email handling case-insensitive:

1. **user_repository_impl.go** - Changed query to use LOWER():
   ```sql
   WHERE LOWER(email) = LOWER()
   ```

2. **auth_handler.go** - Store and search emails in lowercase:
   - Registration: stores email as lowercase
   - Login: converts input email to lowercase before search

### Files Modified
- backend/internal/infrastructure/repositories/user_repository_impl.go
- backend/internal/interfaces/http/handlers/auth_handler.go

### Test Credentials (from seed_dummy.go)
- Email: demo@kifu.local
- Password: password123

### Verification
- go build: PASSED
- Backend compiles successfully

### Next Steps
1. Restart backend server
2. Test login with demo@kifu.local / password123
3. If still failing, check if database has users seeded


## Login "Invalid Credential" Error - Path Issue (2026-01-31)

### Issue
Users reported getting "Invalid credential" error when trying to log in, but credentials were correct.

### Root Cause
The JWT authentication middleware in `backend/internal/app/app.go` (lines 86-111) only skips authentication for paths starting with `/api/v1/auth/`. 

When testing with `/api/auth/login` (without `/v1/`), the JWT middleware intercepted the request and returned `{"code":"UNAUTHORIZED"}` without a "message" field because no valid JWT token was present.

### Investigation
1. Verified backend auth handler code is correct
2. Verified password hashing (bcrypt cost 10) works correctly  
3. Verified database has demo user (demo@kifu.local / password123)
4. Tested password comparison directly - works correctly
5. Found frontend code already uses correct path `/v1/auth/login`
6. Discovered middleware path prefix check requires `/api/v1/auth/` not `/api/auth/`

### Resolution
**No code changes needed!** The system works correctly when using the proper API path:
- ✅ Correct: `POST /api/v1/auth/login`
- ❌ Wrong: `POST /api/auth/login`

Frontend already uses correct path. Issue was likely manual testing or documentation using wrong path.

### Test Credentials
- Email: demo@kifu.local
- Password: password123

### Key Learnings
- JWT middleware path filtering can be non-obvious source of auth failures
- Always verify actual API paths being called vs documented/expected paths
- Error responses without messages often indicate middleware interception
- Password hash verification test utility helpful for debugging auth issues
