// lib/rateLimit.ts
import { redis } from './redis'

export async function checkRateLimit(ip: string, namespace = "global") {
    const key = `ratelimit:${namespace}:${ip}`
    const count = await redis.incr(key)

    if (count === 1) {
        await redis.expire(key, 600) // 10 minutes TTL
    }

    return count <= 5
}
