import { createServiceClient } from './service-client'
import { slugify } from '../utils/slugify'

export interface AnimeData {
    anime_id: number
    slug: string
    details: any
    similar_anime: any[]
    popular_anime: any[]
    original_description: string
    ai_description: string
    status: string
    last_fetched: string
    created_at: string
    unified_fetch: boolean
}

/**
 * Get cached anime data by slug (exact match)
 * Returns null if not found
 */
export async function getAnimeBySlug(slug: string): Promise<AnimeData | null> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('anime_data')
            .select('*')
            .eq('slug', slug)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return null
            }
            throw error
        }

        return data
    } catch (error) {
        return null
    }
}

/**
 * Get cached anime data from Supabase
 * Returns null if not found
 */
export async function getAnimeData(animeId: number): Promise<AnimeData | null> {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('anime_data')
            .select('*')
            .eq('anime_id', animeId)
            .single()

        if (error) {
            // Not found is expected for new anime
            if (error.code === 'PGRST116') {
                return null
            }
            throw error
        }

        return data
    } catch (error) {
        return null
    }
}

/**
 * Save complete anime data to Supabase
 * Uses upsert to handle both insert and update cases
 */
export async function saveAnimeData(
    animeId: number,
    details: any,
    similarAnime: any[],
    popularAnime: any[],
    aiDescription: string | null,
    originalDescription: string,
    unifiedFetch: boolean = true
): Promise<boolean> {
    try {
        const supabase = createServiceClient()

        const title = details.title || ''
        const slug = slugify(title)

        const { error } = await supabase
            .from('anime_data')
            .upsert({
                anime_id: animeId,
                slug,
                details,
                similar_anime: similarAnime,
                popular_anime: popularAnime,
                ai_description: aiDescription,
                original_description: originalDescription,
                status: details.status || 'UNKNOWN',
                last_fetched: new Date().toISOString(),
                unified_fetch: unifiedFetch,
            }, {
                onConflict: 'anime_id'
            })

        if (error) {
            console.error('Failed to save anime data:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Error in saveAnimeData:', error)
        return false
    }
}

/**
 * Check if cached anime data should be refreshed
 * Returns true if data is stale based on anime status and unified_fetch flag
 */
export function shouldRefresh(lastFetched: string, status: string, unifiedFetch?: boolean): boolean {
    // Always refresh if not fetched with unified logic
    if (!unifiedFetch) return true

    const lastFetchedDate = new Date(lastFetched)
    const now = new Date()
    const hoursSinceLastFetch = (now.getTime() - lastFetchedDate.getTime()) / (1000 * 60 * 60)

    // RELEASING or NOT_YET_RELEASED: refresh if >= 24 hours
    if (status === 'RELEASING' || status === 'NOT_YET_RELEASED') {
        return hoursSinceLastFetch >= 24
    }

    // FINISHED and others: refresh if >= 3 days (72 hours)
    return hoursSinceLastFetch >= 72
}
