import { redis } from "./redis"

export async function checkRateLimit(ip: string, namespace = "global") {
    const key = `ratelimit:${namespace}:${ip}`
    const count = await redis.incr(key)

    if (count === 1) {
        await redis.expire(key, 300) // 5 minutes TTL
    }

    const ttl = await redis.ttl(key)

    return { allowed: count <= 5, ttl }
}
