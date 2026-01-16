import { createServiceClient } from './service-client'

export interface Episode {
    id: string
    anime_id: number
    tmdb_id: number
    season_number: number
    episode_number: number
    name: string | null
    overview: string | null
    air_date: string | null
    runtime: number | null
    still_url: string | null
    vote_average: number | null
    last_fetched: string
    created_at: string
}

export interface EpisodeComment {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    comment_text: string
    created_at: string
    updated_at: string
}

/**
 * Get all cached episodes for an anime
 */
export async function getEpisodesByAnimeId(animeId: number): Promise<Episode[]> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('episodes')
            .select('*')
            .eq('anime_id', animeId)
            .order('season_number', { ascending: true })
            .order('episode_number', { ascending: true })

        if (error) {
            console.error('Failed to get episodes:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error in getEpisodesByAnimeId:', error)
        return []
    }
}

/**
 * Get a single episode by anime_id, season, and episode number
 */
export async function getEpisode(
    animeId: number,
    seasonNumber: number,
    episodeNumber: number
): Promise<Episode | null> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('episodes')
            .select('*')
            .eq('anime_id', animeId)
            .eq('season_number', seasonNumber)
            .eq('episode_number', episodeNumber)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return null
            }
            throw error
        }

        return data
    } catch (error) {
        console.error('Error in getEpisode:', error)
        return null
    }
}

/**
 * Get episode by its UUID
 */
export async function getEpisodeById(episodeId: string): Promise<Episode | null> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('episodes')
            .select('*')
            .eq('id', episodeId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return null
            }
            throw error
        }

        return data
    } catch (error) {
        console.error('Error in getEpisodeById:', error)
        return null
    }
}

/**
 * Save/upsert episodes for an anime
 * Used when caching TMDB episode data
 */
export async function saveEpisodes(
    animeId: number,
    episodes: {
        tmdb_id: number
        season_number: number
        episode_number: number
        name?: string | null
        overview?: string | null
        air_date?: string | null
        runtime?: number | null
        still_url?: string | null
        vote_average?: number | null
    }[]
): Promise<boolean> {
    if (episodes.length === 0) return true

    try {
        const supabase = createServiceClient()
        const now = new Date().toISOString()

        const episodesData = episodes.map(ep => ({
            anime_id: animeId,
            tmdb_id: ep.tmdb_id,
            season_number: ep.season_number,
            episode_number: ep.episode_number,
            name: ep.name || null,
            overview: ep.overview || null,
            air_date: ep.air_date || null,
            runtime: ep.runtime || null,
            still_url: ep.still_url || null,
            vote_average: ep.vote_average || null,
            last_fetched: now,
        }))

        const { error } = await supabase
            .from('episodes')
            .upsert(episodesData, {
                onConflict: 'anime_id,season_number,episode_number'
            })

        if (error) {
            console.error('Failed to save episodes:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Error in saveEpisodes:', error)
        return false
    }
}

/**
 * Check if episodes cache should be refreshed
 * Returns true if no episodes exist or last_fetched > 24h
 */
export async function shouldRefreshEpisodes(animeId: number): Promise<boolean> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('episodes')
            .select('last_fetched')
            .eq('anime_id', animeId)
            .order('last_fetched', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return true
            }
            return true
        }

        const lastFetched = new Date(data.last_fetched)
        const now = new Date()
        const hoursSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60)

        return hoursSinceLastFetch >= 24
    } catch (error) {
        return true
    }
}

/**
 * Get comments for an episode using the RPC function
 */
export async function getEpisodeComments(
    episodeId: string,
    limit: number = 20,
    sortOrder: 'newest' | 'oldest' = 'newest'
): Promise<EpisodeComment[]> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase.rpc('get_episode_comments', {
            target_episode_id: episodeId,
            limit_count: limit,
            sort_order: sortOrder
        })

        if (error) {
            console.error('Failed to get episode comments:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error in getEpisodeComments:', error)
        return []
    }
}

/**
 * Get all cached episodes for build-time static generation
 */
export async function getAllCachedEpisodes(): Promise<{
    anime_id: number
    slug: string
    season_number: number
    episode_number: number
}[]> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('episodes')
            .select(`
                anime_id,
                season_number,
                episode_number,
                anime_data!inner(slug)
            `)

        if (error) {
            console.error('Failed to get all cached episodes:', error)
            return []
        }

        return (data || []).map(ep => ({
            anime_id: ep.anime_id,
            slug: (ep.anime_data as any).slug,
            season_number: ep.season_number,
            episode_number: ep.episode_number
        }))
    } catch (error) {
        console.error('Error in getAllCachedEpisodes:', error)
        return []
    }
}
