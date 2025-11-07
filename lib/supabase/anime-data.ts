import { createClient } from './server-client'

export interface AnimeData {
    anime_id: number
    details: any // Full anime details object
    similar_anime: any[] // Array of similar anime
    popular_anime: any[] // Array of popular anime
    original_description: string
    ai_description: string
    status: string // FINISHED, RELEASING, etc
    last_fetched: string
    created_at: string
}

/**
 * Get cached anime data from Supabase
 * Returns null if not found
 */
export async function getAnimeData(animeId: number): Promise<AnimeData | null> {
    try {
        const supabase = await createClient()

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
    originalDescription: string
): Promise<boolean> {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('anime_data')
            .upsert({
                anime_id: animeId,
                details,
                similar_anime: similarAnime,
                popular_anime: popularAnime,
                ai_description: aiDescription,
                original_description: originalDescription,
                status: details.status || 'UNKNOWN',
                last_fetched: new Date().toISOString(),
            }, {
                onConflict: 'anime_id'
            })

        if (error) {
            return false
        }

        return true
    } catch (error) {
        return false
    }
}

/**
 * Check if cached anime data should be refreshed
 * Returns true if data is stale based on anime status
 */
export function shouldRefresh(lastFetched: string, status: string): boolean {
    const lastFetchedDate = new Date(lastFetched)
    const now = new Date()
    const hoursSinceLastFetch = (now.getTime() - lastFetchedDate.getTime()) / (1000 * 60 * 60)

    // FINISHED anime: refresh if >= 14 days (336 hours)
    if (status === 'FINISHED') {
        return hoursSinceLastFetch >= 336
    }

    // RELEASING or other status: refresh if >= 1 day (24 hours)
    return hoursSinceLastFetch >= 24
}
