import { createClient } from '@/lib/supabase/server-client'

type RateLimitConfig = {
  maxRequests: number
  windowMinutes: number
}

// Tiered rate limit configurations
const CONFIGS: Record<string, RateLimitConfig> = {
  'recommendations_anonymous': {
    maxRequests: 3,
    windowMinutes: 10
  },
  'recommendations_authenticated': {
    maxRequests: 10,
    windowMinutes: 10
  },
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: string | null
  limit: number
}

export async function checkRateLimit(
  identifier: string,
  namespace: string = 'recommendations_anonymous'
): Promise<RateLimitResult> {

  const supabase = await createClient()
  const config = CONFIGS[namespace]

  if (!config) {
    console.error('[Rate Limit] Invalid rate limit namespace:', namespace)
    return {
      allowed: false,
      remaining: 0,
      resetAt: null,
      limit: 0
    }
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000)

  try {
    // Try to find existing rate limit record within current window
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('namespace', namespace)
      .gte('window_start', windowStart.toISOString())
      .single()


    if (fetchError && fetchError.code !== 'PGRST116') {
      // Real error (not just "not found")
      console.error('[Rate Limit] Fetch error (not PGRST116):', fetchError)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: null,
        limit: config.maxRequests
      }
    }

    if (!existing) {
      // First request in this window - create new record
      const windowEnd = new Date(now.getTime() + config.windowMinutes * 60 * 1000)

      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          identifier,
          namespace,
          request_count: 1,
          window_start: now.toISOString(),
          window_end: windowEnd.toISOString()
        })

      if (insertError) {
        console.error('[Rate Limit] Insert error:', insertError)
      } else {
      }

      const result = {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: windowEnd.toISOString(),
        limit: config.maxRequests
      }
      return result
    }

    // Existing window - increment counter
    const newCount = existing.request_count + 1
    const allowed = newCount <= config.maxRequests

    if (allowed) {
      // Only increment if still allowed
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({ request_count: newCount })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[Rate Limit] Update error:', updateError)
      } else {
      }
    } else {
    }

    const result = {
      allowed,
      remaining: Math.max(0, config.maxRequests - newCount),
      resetAt: existing.window_end,
      limit: config.maxRequests
    }
    return result

  } catch (error) {
    console.error('[Rate Limit] Unexpected error:', error)
    // Fail open - allow request on error
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: null,
      limit: config.maxRequests
    }
  }
}
