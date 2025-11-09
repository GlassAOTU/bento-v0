-- Migration: Create rate_limits table for tiered rate limiting
-- Replaces Redis/Upstash for rate limiting

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,           -- IP address or user_id
  namespace TEXT NOT NULL,             -- 'recommendations_anonymous' or 'recommendations_authenticated'
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per identifier per window
  CONSTRAINT unique_rate_limit UNIQUE(identifier, namespace, window_start)
);

-- Index for fast lookups during rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(identifier, namespace, window_start);

-- Index for cleanup cron job
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON rate_limits(created_at);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for API routes)
CREATE POLICY "Service role has full access to rate_limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE rate_limits IS 'Rate limiting table with tiered limits for anonymous vs authenticated users';
COMMENT ON COLUMN rate_limits.identifier IS 'IP address for anonymous users, user_id for authenticated users';
COMMENT ON COLUMN rate_limits.namespace IS 'recommendations_anonymous (3/10min) or recommendations_authenticated (10/10min)';
COMMENT ON COLUMN rate_limits.window_start IS 'Start of the rate limit window';
COMMENT ON COLUMN rate_limits.window_end IS 'End of the rate limit window (window_start + N minutes)';
