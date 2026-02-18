-- Seed richer demo data for a guest account.
-- Required psql variables:
--   - guest_email
--   - guest_password
--   - guest_name

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (id, email, password_hash, name, ai_allowlisted, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  lower(:'guest_email'),
  crypt(:'guest_password', gen_salt('bf')),
  :'guest_name',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET
  password_hash = crypt(:'guest_password', gen_salt('bf')),
  name = EXCLUDED.name,
  updated_at = NOW();

INSERT INTO subscriptions (
  id, user_id, tier, ai_quota_remaining, ai_quota_limit, last_reset_at, expires_at
)
SELECT
  gen_random_uuid(),
  u.id,
  'free',
  20,
  20,
  NOW(),
  NULL
FROM users u
WHERE lower(u.email) = lower(:'guest_email')
ON CONFLICT (user_id) DO UPDATE
SET
  tier = EXCLUDED.tier,
  ai_quota_remaining = EXCLUDED.ai_quota_remaining,
  ai_quota_limit = EXCLUDED.ai_quota_limit,
  last_reset_at = EXCLUDED.last_reset_at,
  expires_at = EXCLUDED.expires_at;

INSERT INTO trades (
  id, user_id, bubble_id, binance_trade_id, exchange, symbol, side, quantity, price,
  realized_pnl, trade_time, position_side, open_close, reduce_only
)
SELECT
  gen_random_uuid(),
  u.id,
  NULL,
  (900000000 + gs)::bigint,
  CASE
    WHEN gs % 3 = 0 THEN 'binance_futures'
    WHEN gs % 3 = 1 THEN 'binance_spot'
    ELSE 'upbit'
  END,
  CASE
    WHEN gs % 3 = 0 THEN 'BTCUSDT'
    WHEN gs % 3 = 1 THEN 'ETHUSDT'
    ELSE 'KRW-BTC'
  END,
  CASE WHEN gs % 2 = 0 THEN 'BUY' ELSE 'SELL' END,
  ROUND((0.02 + (gs % 9) * 0.01)::numeric, 4),
  CASE
    WHEN gs % 3 = 0 THEN ROUND((42000 + (gs % 20) * 230)::numeric, 2)
    WHEN gs % 3 = 1 THEN ROUND((2300 + (gs % 30) * 21)::numeric, 2)
    ELSE ROUND((70000000 + (gs % 15) * 380000)::numeric, 0)
  END,
  ROUND((((gs % 11) - 5) * 12.5)::numeric, 2),
  NOW() - ((gs % 55) || ' days')::interval - ((gs % 20) || ' hours')::interval,
  CASE WHEN gs % 2 = 0 THEN 'LONG' ELSE 'SHORT' END,
  CASE WHEN gs % 3 = 0 THEN 'OPEN' ELSE 'CLOSE' END,
  CASE WHEN gs % 4 = 0 THEN true ELSE false END
FROM generate_series(1, 180) gs
CROSS JOIN (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
) u;

INSERT INTO bubbles (
  id, user_id, symbol, timeframe, candle_time, price, bubble_type, memo, tags, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  CASE
    WHEN gs % 3 = 0 THEN 'BTCUSDT'
    WHEN gs % 3 = 1 THEN 'ETHUSDT'
    ELSE 'SOLUSDT'
  END,
  '1d',
  NOW() - ((gs % 95) || ' days')::interval,
  CASE
    WHEN gs % 3 = 0 THEN ROUND((41000 + (gs % 30) * 180)::numeric, 2)
    WHEN gs % 3 = 1 THEN ROUND((2200 + (gs % 45) * 16)::numeric, 2)
    ELSE ROUND((90 + (gs % 60) * 1.8)::numeric, 2)
  END,
  'manual',
  FORMAT('Seed bubble %s: scenario note for retrospective review.', gs),
  ARRAY[
    CASE WHEN gs % 2 = 0 THEN 'trend' ELSE 'retest' END,
    CASE WHEN gs % 5 = 0 THEN 'risk' ELSE 'seed' END
  ]::text[],
  NOW() - ((gs % 95) || ' days')::interval
FROM generate_series(1, 72) gs
CROSS JOIN (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
) u;

WITH target_bubbles AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS rn
  FROM bubbles
  WHERE user_id = (SELECT id FROM users WHERE lower(email) = lower(:'guest_email'))
  LIMIT 48
)
INSERT INTO ai_opinions (
  id, bubble_id, provider, model, prompt_template, response, tokens_used, created_at
)
SELECT
  gen_random_uuid(),
  b.id,
  CASE
    WHEN b.rn % 3 = 0 THEN 'openai'
    WHEN b.rn % 3 = 1 THEN 'claude'
    ELSE 'gemini'
  END,
  CASE
    WHEN b.rn % 3 = 0 THEN 'gpt-4o'
    WHEN b.rn % 3 = 1 THEN 'claude-3-5-sonnet-latest'
    ELSE 'gemini-1.5-pro'
  END,
  'seed-template-v1',
  'Seeded AI note: risk, scenario, and next action candidate.',
  420 + (b.rn % 80),
  NOW() - ((b.rn % 30) || ' days')::interval
FROM target_bubbles b;

WITH target_bubbles AS (
  SELECT
    id,
    price,
    ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS rn
  FROM bubbles
  WHERE user_id = (SELECT id FROM users WHERE lower(email) = lower(:'guest_email'))
  LIMIT 48
)
INSERT INTO outcomes (
  id, bubble_id, period, reference_price, outcome_price, pnl_percent, calculated_at
)
SELECT
  gen_random_uuid(),
  b.id,
  p.period,
  b.price,
  ROUND((b.price * (1 + ((b.rn % 9) - 4) * p.scale / 100.0))::numeric, 6),
  ROUND((((b.rn % 9) - 4) * p.scale)::numeric, 2),
  NOW() - ((b.rn % 14) || ' days')::interval
FROM target_bubbles b
CROSS JOIN (
  VALUES
    ('1h', 0.45::numeric),
    ('4h', 0.95::numeric),
    ('1d', 1.75::numeric)
) p(period, scale);

WITH target_bubbles AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS rn
  FROM bubbles
  WHERE user_id = (SELECT id FROM users WHERE lower(email) = lower(:'guest_email'))
  LIMIT 36
)
INSERT INTO review_notes (
  id, user_id, bubble_id, title, content, tags, lesson_learned, emotion, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  b.id,
  CASE
    WHEN b.rn % 3 = 0 THEN 'AI 복기 요약'
    ELSE FORMAT('복기 노트 #%s', b.rn)
  END,
  CASE
    WHEN b.rn % 3 = 0 THEN 'AI suggested scenario and risk controls. Review after close.'
    ELSE 'Manual retrospective note for context, bias check, and next trigger.'
  END,
  CASE
    WHEN b.rn % 3 = 0 THEN ARRAY['ai', 'seed']::text[]
    ELSE ARRAY['review', 'seed']::text[]
  END,
  'Keep entries rule-based and compare against prior similar setups.',
  CASE
    WHEN b.rn % 4 = 0 THEN 'calm'
    WHEN b.rn % 4 = 1 THEN 'confident'
    WHEN b.rn % 4 = 2 THEN 'uncertain'
    ELSE 'fearful'
  END,
  NOW() - ((b.rn % 40) || ' days')::interval,
  NOW() - ((b.rn % 40) || ' days')::interval
FROM target_bubbles b
CROSS JOIN (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
) u;

INSERT INTO manual_positions (
  id, user_id, symbol, asset_class, venue, position_side, size, entry_price,
  stop_loss, take_profit, leverage, strategy, memo, status, opened_at, closed_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  p.symbol,
  'crypto',
  p.venue,
  p.position_side,
  p.size,
  p.entry_price,
  p.stop_loss,
  p.take_profit,
  p.leverage,
  p.strategy,
  p.memo,
  'open',
  NOW() - p.open_offset,
  NULL,
  NOW() - p.open_offset,
  NOW() - p.open_offset
FROM (
  VALUES
    ('BTCUSDT', 'binance_futures', 'long',  '0.1800'::numeric, '43650'::numeric, '42100'::numeric, '46800'::numeric, '3.0'::numeric, 'trend-follow', 'Seed manual position A', INTERVAL '5 days'),
    ('ETHUSDT', 'binance_spot',    'long',  '1.2500'::numeric, '2480'::numeric,  '2330'::numeric,  '2760'::numeric, '1.0'::numeric, 'swing',        'Seed manual position B', INTERVAL '9 days'),
    ('SOLUSDT', 'binance_futures', 'short', '9.8000'::numeric, '168'::numeric,   '181'::numeric,   '142'::numeric,  '2.0'::numeric, 'mean-revert',  'Seed manual position C', INTERVAL '3 days')
) p(symbol, venue, position_side, size, entry_price, stop_loss, take_profit, leverage, strategy, memo, open_offset)
CROSS JOIN (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
) u;

INSERT INTO runs (
  run_id, user_id, run_type, status, started_at, finished_at, meta, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  'trade_csv_import',
  'completed',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '119 minutes',
  '{"source":"seed_guest_demo_data","note":"demo completed run"}'::jsonb,
  NOW() - INTERVAL '119 minutes'
FROM (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
) u;

