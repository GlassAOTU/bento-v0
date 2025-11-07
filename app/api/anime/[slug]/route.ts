import { NextResponse } from 'next/server'
import { unslugify } from '@/lib/utils/slugify'
import { fetchFullAnimeDetails, fetchSimilarAnime, fetchPopularAnime } from '@/lib/anilist'
import { getAnimeData, shouldRefresh } from '@/lib/supabase/anime-data'

/**
 * Background refresh: fetch new data without blocking response
 * Fire-and-forget - errors are silently ignored
 * Note: This only fetches AniList data; AI description is handled separately
 */
async function triggerBackgroundRefresh(searchTerm: string, animeId: number) {
    try {
        // Just fetch from AniList to update the cache
        // Description endpoint will handle saving to DB when AI is generated
        await fetchFullAnimeDetails(searchTerm)
        await Promise.all([
            fetchSimilarAnime(animeId, 4),
            fetchPopularAnime(4)
        ])
    } catch {
        // Silently fail - this is background refresh
    }
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const searchTerm = unslugify(slug)

        // Try to get cached data from Supabase first
        // We need to fetch from AniList first to get the ID for cache lookup
        let details
        try {
            details = await fetchFullAnimeDetails(searchTerm)
        } catch (error) {
            return NextResponse.json(
                { error: 'Failed to fetch anime data' },
                { status: 500 }
            )
        }

        // Now check cache with the anime ID
        const cachedData = await getAnimeData(details.id)

        if (cachedData) {
            // Check if we should refresh in background
            if (shouldRefresh(cachedData.last_fetched, cachedData.status)) {
                // Trigger background refresh (don't wait for it)
                triggerBackgroundRefresh(searchTerm, details.id)
            }

            // Return cached data with AI description if available
            return NextResponse.json({
                details: cachedData.details,
                similar: cachedData.similar_anime,
                popular: cachedData.popular_anime,
                aiDescription: cachedData.ai_description || null // Include AI description if available
            })
        }

        // No cache - fetch everything (don't save yet, wait for AI description)
        const [similar, popular] = await Promise.all([
            fetchSimilarAnime(details.id, 4),
            fetchPopularAnime(4)
        ])

        // Return response without AI description (frontend will fetch separately)
        // Description endpoint will generate AI and save everything to DB
        return NextResponse.json({
            details,
            similar,
            popular,
            aiDescription: null // Frontend should fetch from description endpoint
        })

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch anime data' },
            { status: 500 }
        )
    }
}
