import { redis } from '../redis'
import {
    fetchFullAnimeDetails,
    fetchSimilarAnime,
    fetchPopularAnime
} from '../anilist'

const CACHE_TTL = 86400 // 24 hours in seconds

/**
 * Get cached anime details or fetch from AniList
 */
export async function getCachedAnimeDetails(searchTerm: string) {
    const cacheKey = `anime:details:${searchTerm.toLowerCase()}`

    try {
        // Try to get from cache first
        const cached = await redis.get(cacheKey)
        if (cached) {
            console.log(`[Cache HIT] Anime details for: ${searchTerm}`)
            // Upstash Redis automatically deserializes JSON, so return directly
            return typeof cached === 'string' ? JSON.parse(cached) : cached
        }

        console.log(`[Cache MISS] Fetching anime details for: ${searchTerm}`)

        // Fetch from AniList
        const data = await fetchFullAnimeDetails(searchTerm)

        // Cache the result
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data))

        return data
    } catch (error) {
        console.error(`[Cache Error] Failed to get anime details for ${searchTerm}:`, error)
        // If caching fails, still try to fetch directly
        return await fetchFullAnimeDetails(searchTerm)
    }
}

/**
 * Get cached similar anime or fetch from AniList
 */
export async function getCachedSimilarAnime(animeId: number, limit: number = 4) {
    const cacheKey = `anime:similar:${animeId}:${limit}`

    try {
        // Try to get from cache first
        const cached = await redis.get(cacheKey)
        if (cached) {
            console.log(`[Cache HIT] Similar anime for ID: ${animeId}`)
            // Upstash Redis automatically deserializes JSON, so return directly
            return typeof cached === 'string' ? JSON.parse(cached) : cached
        }

        console.log(`[Cache MISS] Fetching similar anime for ID: ${animeId}`)

        // Fetch from AniList
        const data = await fetchSimilarAnime(animeId, limit)

        // Cache the result
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data))

        return data
    } catch (error) {
        console.error(`[Cache Error] Failed to get similar anime for ${animeId}:`, error)
        // If caching fails, still try to fetch directly
        return await fetchSimilarAnime(animeId, limit)
    }
}

/**
 * Get cached popular anime or fetch from AniList
 */
export async function getCachedPopularAnime(count: number = 4) {
    const cacheKey = `anime:popular:${count}`

    try {
        // Try to get from cache first
        const cached = await redis.get(cacheKey)
        if (cached) {
            console.log(`[Cache HIT] Popular anime (count: ${count})`)
            // Upstash Redis automatically deserializes JSON, so return directly
            return typeof cached === 'string' ? JSON.parse(cached) : cached
        }

        console.log(`[Cache MISS] Fetching popular anime (count: ${count})`)

        // Fetch from AniList
        const data = await fetchPopularAnime(count)

        // Cache the result
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data))

        return data
    } catch (error) {
        console.error(`[Cache Error] Failed to get popular anime:`, error)
        // If caching fails, still try to fetch directly
        return await fetchPopularAnime(count)
    }
}

/**
 * Invalidate cache for specific anime
 */
export async function invalidateAnimeCache(searchTerm: string, animeId?: number) {
    const keys = [
        `anime:details:${searchTerm.toLowerCase()}`,
    ]

    if (animeId) {
        keys.push(`anime:similar:${animeId}:*`)
    }

    try {
        for (const key of keys) {
            await redis.del(key)
        }
        console.log(`[Cache] Invalidated cache for: ${searchTerm}`)
    } catch (error) {
        console.error(`[Cache Error] Failed to invalidate cache for ${searchTerm}:`, error)
    }
}
