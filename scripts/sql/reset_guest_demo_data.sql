-- Reset most guest-facing demo data for a single user.
-- Required psql variable:
--   - guest_email

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM summary_packs
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM runs
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM guided_reviews
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM user_streaks
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM review_notes
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM manual_positions
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM positions
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM trade_events
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM accounts
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM trades
WHERE user_id IN (SELECT id FROM guest);

WITH guest AS (
  SELECT id FROM users WHERE lower(email) = lower(:'guest_email')
)
DELETE FROM bubbles
WHERE user_id IN (SELECT id FROM guest);

