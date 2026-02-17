# Security Status (Current Implementation)

Last updated: 2026-02-17

## 1) Implemented Controls

### Secrets and startup requirements
- Backend requires `JWT_SECRET` and `KIFU_ENC_KEY` at startup.
- Missing values fail boot (safe default).

### Credential encryption at rest
- Exchange API credentials are encrypted before DB write.
- User AI API keys are encrypted before DB write.
- Encryption implementation uses AES-256-GCM with random nonce.
- Encryption key is loaded from `KIFU_ENC_KEY` (base64-decoded 32-byte key).

### Authentication data protection
- User passwords are stored as bcrypt hash.
- Refresh tokens are stored as SHA-256 hash (not plaintext token).

### Repository hygiene
- Public repo secret scan report exists:
  - `docs/security_public_release_check.md`

## 2) Current Gaps / Risk Notes

### User content encryption scope
- Trade records, bubbles, review notes, and similar user content are not yet field-level encrypted.
- Those records are currently protected by DB/network/runtime controls, not zero-knowledge design.

### Client token storage
- Web auth tokens are persisted in browser local storage (not HttpOnly cookie).
- This is functional, but weaker against XSS than cookie-based session handling.

### Key lifecycle
- No full key rotation/re-encryption process is documented or automated yet.
- Current encrypted value prefix supports version marker, but operational key rotation workflow is pending.

## 3) Submission Position (what is accurate to claim)

Accurate claims now:
- credentials (exchange/API keys) are encrypted at rest,
- passwords and refresh tokens are hashed,
- backend requires security-critical env secrets before startup.

Do not claim yet:
- full zero-knowledge encryption for all user records,
- client-side end-to-end encryption with user-only key recovery model.

## 4) Planned Security Expansion

Short term:
- document encryption boundary clearly in public docs,
- add pre-deploy secret/env validation checks.

Mid term:
- move auth session to secure cookie strategy,
- introduce optional privacy mode for selected user content encryption,
- define key rotation and recovery policy.

