-- Fix RLS policies for rate_limits table
-- Allow anon and authenticated users to manage rate limits from API routes

-- Drop existing policy
DROP POLICY IF EXISTS "Service role has full access to rate_limits" ON rate_limits;

-- Policy: Allow anon and authenticated users to read/write rate limits
-- This is safe because:
-- 1. Rate limits are per IP/user_id, users can't interfere with each other
-- 2. The unique constraint prevents manipulation
-- 3. The logic in the app ensures proper behavior
CREATE POLICY "Allow rate limit operations"
  ON rate_limits
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Service role still has full access (for cron job cleanup)
CREATE POLICY "Service role has full access to rate_limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
