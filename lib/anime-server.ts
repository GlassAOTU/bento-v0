import { createServiceClient } from './supabase/service-client'
import { unslugify } from './utils/slugify'
import { resolveAnilistId, enhanceWithTMDBImages } from './anime-fetch'
import { fetchAnimeById } from './anilist'
import { saveAnimeData } from './supabase/anime-data'

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
    // Try cache first
    const cached = await getAnimeDataBySlug(slug)

    // Check if cache has TMDB-enhanced images (tmdb.org URLs indicate TMDB data)
    const hasTMDBImages = cached?.details?.bannerImage?.includes('tmdb.org') ||
                          cached?.details?.coverImage?.includes('tmdb.org')

    if (cached && hasTMDBImages) {
        return cached
    }

    // Cache miss or no TMDB images - fetch fresh
    try {
        const searchTerm = unslugify(slug)
        const anilistId = await resolveAnilistId(searchTerm)
        if (!anilistId) return cached

        const details = await fetchAnimeById(anilistId)
        if (!details) return cached

        // Enhance with TMDB images
        const tmdbImages = await enhanceWithTMDBImages(anilistId, details.title)
        const enrichedDetails = {
            ...details,
            bannerImage: tmdbImages.bannerImage || details.bannerImage || null,
            coverImage: tmdbImages.coverImage || details.coverImage || null
        }

        // Update cache with fresh data for future requests
        await saveAnimeData(
            anilistId,
            enrichedDetails,
            [],
            [],
            null,
            details.description || ''
        )

        return {
            details: enrichedDetails as AnimeDetails,
            similar_anime: [],
            popular_anime: []
        }
    } catch (error) {
        console.error('Error fetching fresh anime data:', error)
        return cached
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
