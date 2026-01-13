import { createServiceClient } from './supabase/service-client'
import { unslugify } from './utils/slugify'
import { resolveAnilistId, fetchUnifiedAnimeData } from './anime-fetch'
import { getAnimeData, getAnimeBySlug, shouldRefresh } from './supabase/anime-data'

interface AnimeDetails {
    id: number
    title: string
    romajiTitle?: string
    bannerImage: string
    coverImage: string
    description: string
    episodes?: number
    status: string
    aired: string
    premiered?: string
    studios?: string
    genres?: string[]
    duration?: string
    rating?: number
    streamingLinks?: { url: string; site: string }[]
    seasons?: number
}

interface AnimeData {
    details: AnimeDetails
    similar_anime?: any[]
    popular_anime?: any[]
    ai_description?: string
}

export async function getAnimeDataBySlug(slug: string): Promise<AnimeData | null> {
    try {
        const supabase = createServiceClient()
        const searchTerm = unslugify(slug)

        const { data, error } = await supabase
            .from('anime_data')
            .select('details, similar_anime, popular_anime, ai_description')
            .ilike('details->>title', `%${searchTerm}%`)
            .limit(1)
            .single()

        if (error || !data) {
            return null
        }

        return {
            details: data.details as AnimeDetails,
            similar_anime: data.similar_anime,
            popular_anime: data.popular_anime,
            ai_description: data.ai_description,
        }
    } catch (error) {
        console.error('Error fetching anime data by slug:', error)
        return null
    }
}

export async function getOrFetchAnimeBySlug(slug: string): Promise<AnimeData | null> {
    // Try direct slug lookup first (most reliable)
    const cachedBySlug = await getAnimeBySlug(slug)
    if (cachedBySlug) {
        const isStale = shouldRefresh(
            cachedBySlug.last_fetched,
            cachedBySlug.status,
            cachedBySlug.unified_fetch ?? false
        )
        if (isStale) {
            fetchUnifiedAnimeData(cachedBySlug.anime_id).catch(err => {
                console.error(`[Slug] Background refresh failed:`, err)
            })
        }
        return {
            details: cachedBySlug.details as AnimeDetails,
            similar_anime: cachedBySlug.similar_anime,
            popular_anime: cachedBySlug.popular_anime,
            ai_description: cachedBySlug.ai_description
        }
    }

    // Fall back to search-based resolution
    const searchTerm = unslugify(slug)

    // Resolve AniList ID
    const anilistId = await resolveAnilistId(searchTerm)
    if (!anilistId) {
        // Fall back to slug-based search
        return getAnimeDataBySlug(slug)
    }

    // Check cache by AniList ID
    const cached = await getAnimeData(anilistId)
    const isStale = cached && shouldRefresh(
        cached.last_fetched,
        cached.status,
        cached.unified_fetch ?? false
    )

    // Return cached (even if stale) for fast OG response
    if (cached) {
        // Trigger background refresh if stale (fire-and-forget)
        if (isStale) {
            fetchUnifiedAnimeData(anilistId).catch(err => {
                console.error(`[OG Background] Refresh failed for ${anilistId}:`, err)
            })
        }
        return {
            details: cached.details as AnimeDetails,
            similar_anime: cached.similar_anime,
            popular_anime: cached.popular_anime,
            ai_description: cached.ai_description
        }
    }

    // Cache miss - must fetch (blocking for OG)
    try {
        const data = await fetchUnifiedAnimeData(anilistId)
        return {
            details: data.details as AnimeDetails,
            similar_anime: data.similar_anime,
            popular_anime: data.popular_anime,
            ai_description: data.ai_description ?? undefined
        }
    } catch (error) {
        console.error('Error fetching anime data for OG:', error)
        return null
    }
}

export async function getAllCachedAnime(): Promise<{ title: string; last_fetched: string }[]> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('anime_data')
            .select('details->>title, last_fetched')
            .order('last_fetched', { ascending: false })

        if (error || !data) {
            return []
        }

        return data.map((row: any) => ({
            title: row.title,
            last_fetched: row.last_fetched,
        }))
    } catch (error) {
        console.error('Error fetching all cached anime:', error)
        return []
    }
}

export async function getAllPublicProfiles(): Promise<{ username: string }[]> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .not('username', 'is', null)

        if (error || !data) {
            return []
        }

        return data
    } catch (error) {
        console.error('Error fetching public profiles:', error)
        return []
    }
}

export async function getAllPublicWatchlists(): Promise<{ username: string; slug: string; updated_at: string }[]> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('watchlists')
            .select(`
                slug,
                updated_at,
                profiles!inner(username)
            `)
            .eq('is_public', true)
            .not('slug', 'is', null)
            .order('updated_at', { ascending: false })

        if (error || !data) {
            return []
        }

        return data.map((row: any) => ({
            username: row.profiles?.username,
            slug: row.slug,
            updated_at: row.updated_at,
        })).filter((row: any) => row.username && row.slug)
    } catch (error) {
        console.error('Error fetching public watchlists:', error)
        return []
    }
}
