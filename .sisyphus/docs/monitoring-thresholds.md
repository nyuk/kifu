# AI Agent Operations — Monitoring Alert Thresholds

> Initial alert thresholds for the AI Agent Operations Expansion (Tasks 1-14).
> These values are starting points — tune based on production traffic patterns.

## Overview

Three primary metric categories are monitored:

1. **Failure Rate** — percentage of failed API calls / runs
2. **Response Delay** — p95 latency for key endpoints
3. **Run Backlog** — number of pending/stuck runs in queue

---

## 1. Failure Rate Thresholds

| Metric | Warning | Critical | Measurement Window |
|---|---|---|---|
| AI opinion request failure rate | > 10% | > 25% | 15 min rolling |
| Summary generation failure rate | > 15% | > 30% | 15 min rolling |
| Admin API error rate (5xx) | > 5% | > 15% | 5 min rolling |
| Overall API error rate (5xx) | > 3% | > 10% | 5 min rolling |

### How to Measure

```sql
-- AI opinion failure rate (last 15 min)
SELECT
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / NULLIF(COUNT(*), 0) AS failure_pct
FROM runs
WHERE run_type = 'ai_opinion'
  AND created_at > NOW() - INTERVAL '15 minutes';

-- Summary generation failure rate (last 15 min)
SELECT
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / NULLIF(COUNT(*), 0) AS failure_pct
FROM runs
WHERE run_type IN ('summary_ondemand', 'pack_latest')
  AND created_at > NOW() - INTERVAL '15 minutes';
```

### Response Actions

| Level | Action |
|---|---|
| Warning | Log alert, notify Telegram channel |
| Critical | Disable via policy toggle (Layer 1 rollback), investigate |

---

## 2. Response Delay Thresholds (p95 Latency)

| Endpoint | Warning | Critical |
|---|---|---|
| `POST /ai/one-shot` | > 10s | > 30s |
| `POST /packs/generate-latest` | > 15s | > 45s |
| `GET /admin/agent-services` | > 2s | > 5s |
| `GET /admin/policies` | > 1s | > 3s |
| `GET /admin/telemetry` | > 3s | > 8s |

### Notes

- AI provider calls (OpenAI/Claude/Gemini) have inherent latency variance.
- `generate-latest` involves run creation + provider call; higher threshold is expected.
- Admin endpoints should be fast (database queries only).

### Response Actions

| Level | Action |
|---|---|
| Warning | Monitor trend; check provider status pages |
| Critical | Check provider rate limits; consider disabling via policy |

---

## 3. Run Backlog Thresholds

| Metric | Warning | Critical | Check Interval |
|---|---|---|---|
| Pending runs (any type) | > 10 | > 25 | Every 5 min |
| Running runs older than 5 min | > 3 | > 8 | Every 5 min |
| Failed runs (last hour) | > 5 | > 15 | Every 15 min |

### How to Measure

```sql
-- Pending run backlog
SELECT run_type, COUNT(*)
FROM runs
WHERE status = 'pending'
GROUP BY run_type;

-- Stuck runs (running > 5 min)
SELECT id, run_type, created_at
FROM runs
WHERE status = 'running'
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Failed runs (last hour)
SELECT run_type, COUNT(*)
FROM runs
WHERE status = 'failed'
  AND finished_at > NOW() - INTERVAL '1 hour'
GROUP BY run_type;
```

### Response Actions

| Level | Action |
|---|---|
| Warning | Check provider health; review recent deployments |
| Critical | Cancel stuck runs (Layer 2 rollback); disable generation via policy |

---

## Provider-Specific Monitoring

| Provider | Rate Limit Signal | Action |
|---|---|---|
| OpenAI | HTTP 429 in logs | Back off; reduce `AI_RATE_LIMIT_RPM` env var |
| Anthropic (Claude) | HTTP 429 / 529 | Back off; check usage dashboard |
| Google (Gemini) | HTTP 429 | Back off; check quota in Google Cloud Console |

### Log Patterns to Watch

```bash
# Rate limit hits
docker logs kifu-backend --tail 500 | grep -i "429\|rate.limit\|throttl"

# Provider errors
docker logs kifu-backend --tail 500 | grep -i "provider.*error\|provider.*fail"

# Run failures
docker logs kifu-backend --tail 500 | grep -i "run.*fail\|run.*error"
```

---

## Dashboard Queries (Admin Telemetry)

The Admin Telemetry endpoint (`GET /api/v1/admin/telemetry`) provides pre-aggregated metrics. Use the Admin UI at `/admin/agent-services` for visual monitoring.

### Key Metrics to Track Weekly

1. Total runs created vs completed vs failed (by type)
2. Average provider response time trend
3. Policy toggle change frequency
4. Active user count using AI features

---

## Threshold Revision Schedule

- **Week 1 post-deploy**: Review all thresholds against actual traffic
- **Week 4**: Adjust based on 30-day baseline data
- **Ongoing**: Re-evaluate after any provider pricing/rate-limit change
