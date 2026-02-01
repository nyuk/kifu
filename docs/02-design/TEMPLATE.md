# Design: [Feature Name]

> Created: YYYY-MM-DD
> Plan: [link to plan document]
> Status: Draft | Review | Approved

## Overview
[Brief description of the technical approach]

## Architecture

```
[ASCII diagram or description]
```

## API Design

### Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/resource | Description | Yes |
| POST | /api/resource | Description | Yes |

### Request/Response Examples
```json
// POST /api/resource
// Request
{
  "field": "value"
}

// Response
{
  "id": "uuid",
  "field": "value"
}
```

## Data Models

### Entity Name
```typescript
type EntityName = {
  id: string
  field1: string
  field2: number
  createdAt: string
  updatedAt: string
}
```

## UI Components
| Component | Location | Purpose |
|-----------|----------|---------|
| ComponentName | /components/X | Description |

## State Management
| Store | Purpose |
|-------|---------|
| useXStore | Manages X state |

## Files to Create/Modify
| File | Action | Description |
|------|--------|-------------|
| path/file.ts | Create | Description |
| path/file.ts | Modify | Description |

## Security Considerations
- [ ] Input validation
- [ ] Authentication required
- [ ] Authorization checks

## Testing Strategy
- [ ] Unit tests for: [list]
- [ ] Integration tests for: [list]

---
## Approval
- [ ] Approved by: [name]
- [ ] Date: YYYY-MM-DD
