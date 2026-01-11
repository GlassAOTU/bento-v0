import { searchAnime, fetchAnimeById } from './anilist'
import { getAnilistBySearchTerm, getTMDBByAnilistId } from './anime-mappings'
import { getTMDBAnimeDetails, findTMDBAnimeByTitle } from './tmdb'
import { getTMDBIdFromARM } from './arm-api'

export async function resolveAnilistId(searchTerm: string): Promise<number | null> {
    const directId = getAnilistBySearchTerm(searchTerm)
    if (directId) return directId

    try {
        const results = await searchAnime(searchTerm, 1)
        return results?.[0]?.id ?? null
    } catch {
        return null
    }
}

export async function enhanceWithTMDBImages(anilistId: number, title: string): Promise<{ coverImage: string | null, bannerImage: string | null }> {
    let tmdbData = null

    // Strategy 1: Manual mapping by AniList ID
    const manualById = getTMDBByAnilistId(anilistId)
    if (manualById) {
        console.log(`[TMDB] Using manual mapping for AniList ID ${anilistId}`)
        try {
            tmdbData = await getTMDBAnimeDetails(manualById.tmdbId, anilistId)
        } catch (err) {
            console.error(`[TMDB] Manual mapping fetch failed:`, err)
        }
    }

    // Strategy 2: Title search
    if (!tmdbData) {
        console.log(`[TMDB] Trying title search for "${title}"`)
        try {
            const tmdbId = await findTMDBAnimeByTitle(title, anilistId)
            if (tmdbId) {
                console.log(`[TMDB] Found TMDB ID ${tmdbId} via title search`)
                tmdbData = await getTMDBAnimeDetails(tmdbId, anilistId)
            }
        } catch (err) {
            console.error(`[TMDB] Title search failed:`, err)
        }
    }

    // Strategy 3: ARM API fallback
    if (!tmdbData) {
        console.log(`[TMDB] Trying ARM API for AniList ID ${anilistId}`)
        try {
            const armTmdbId = await getTMDBIdFromARM(anilistId)
            if (armTmdbId) {
                console.log(`[TMDB] Found TMDB ID ${armTmdbId} via ARM API`)
                tmdbData = await getTMDBAnimeDetails(armTmdbId, anilistId)
            }
        } catch (err) {
            console.error(`[TMDB] ARM API failed:`, err)
        }
    }

    if (!tmdbData) {
        console.log(`[TMDB] All strategies failed for "${title}" (AniList ID: ${anilistId})`)
        return { coverImage: null, bannerImage: null }
    }

    // Multiple image fallbacks (match API route behavior)
    return {
        coverImage: tmdbData.details?.poster_url || tmdbData.details?.poster_url_original || null,
        bannerImage: tmdbData.details?.backdrop_url_original || tmdbData.details?.backdrop_url || null
    }
}
