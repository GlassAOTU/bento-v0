import { searchAnime, fetchAnimeById, fetchSimilarAnime, fetchPopularAnime } from './anilist'
import { getAnilistBySearchTerm, getTMDBByAnilistId } from './anime-mappings'
import { getTMDBAnimeDetails, findTMDBAnimeByTitle, getTMDBImageUrl, TMDB_POSTER_SIZES, getTMDBShowDetails, getTMDBMovieDetails } from './tmdb'
import { getTMDBIdFromARM } from './arm-api'
import { saveAnimeData } from './supabase/anime-data'

async function getVerifiedTMDBImage(
    anilistId: number,
    fallbackImage: string
): Promise<string> {
    // 1. Manual mapping (most reliable)
    const mapping = getTMDBByAnilistId(anilistId)
    if (mapping) {
        try {
            const details = mapping.type === 'movie'
                ? await getTMDBMovieDetails(mapping.tmdbId)
                : await getTMDBShowDetails(mapping.tmdbId)
            if (details?.poster_path) {
                return getTMDBImageUrl(details.poster_path, TMDB_POSTER_SIZES.W500) || fallbackImage
            }
        } catch { }
    }

    // 2. ARM API (community-verified mappings)
    try {
        const armTmdbId = await getTMDBIdFromARM(anilistId)
        if (armTmdbId) {
            const tvDetails = await getTMDBShowDetails(armTmdbId).catch(() => null)
            if (tvDetails?.poster_path) {
                return getTMDBImageUrl(tvDetails.poster_path, TMDB_POSTER_SIZES.W500) || fallbackImage
            }
            const movieDetails = await getTMDBMovieDetails(armTmdbId).catch(() => null)
            if (movieDetails?.poster_path) {
                return getTMDBImageUrl(movieDetails.poster_path, TMDB_POSTER_SIZES.W500) || fallbackImage
            }
        }
    } catch { }

    // 3. No verified mapping - keep AniList image (safe default)
    return fallbackImage
}

export interface UnifiedAnimeData {
    details: any
    similar_anime: any[]
    popular_anime: any[]
    ai_description: string | null
}

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

/**
 * Unified fetch that gets all anime data in one go:
 * - AniList details (source of truth)
 * - TMDB images, seasons, episodes
 * - Similar anime from AniList
 * - Popular anime from AniList
 * Then saves to cache with unified_fetch = true
 */
export async function fetchUnifiedAnimeData(anilistId: number): Promise<UnifiedAnimeData> {
    console.log(`[Unified] Fetching data for AniList ID ${anilistId}`)

    // Fetch AniList data (base)
    const anilistDetails = await fetchAnimeById(anilistId)

    // Fetch full TMDB data (images + seasons + episodes)
    let tmdbData: any = null
    let tmdbId: number | null = null

    // Try manual mapping first
    const manualMapping = getTMDBByAnilistId(anilistId)
    if (manualMapping) {
        tmdbId = manualMapping.tmdbId
        console.log(`[Unified] Using manual mapping: TMDB ${tmdbId}`)
        try {
            tmdbData = await getTMDBAnimeDetails(tmdbId, anilistId)
        } catch (err) {
            console.error(`[Unified] Manual mapping fetch failed:`, err)
        }
    }

    // Try title search
    if (!tmdbData) {
        try {
            const foundId = await findTMDBAnimeByTitle(anilistDetails.title, anilistId)
            if (foundId) {
                tmdbId = foundId
                tmdbData = await getTMDBAnimeDetails(foundId, anilistId)
            }
        } catch (err) {
            console.error(`[Unified] Title search failed:`, err)
        }
    }

    // Try ARM API fallback
    if (!tmdbData) {
        try {
            const armTmdbId = await getTMDBIdFromARM(anilistId)
            if (armTmdbId) {
                tmdbId = armTmdbId
                tmdbData = await getTMDBAnimeDetails(armTmdbId, anilistId)
            }
        } catch (err) {
            console.error(`[Unified] ARM API failed:`, err)
        }
    }

    // Build merged details
    const mergedDetails = {
        id: anilistId,
        tmdbId: tmdbId,
        title: anilistDetails.title,
        romajiTitle: anilistDetails.romajiTitle || anilistDetails.title,
        bannerImage: tmdbData?.details?.backdrop_url_original || tmdbData?.details?.backdrop_url || anilistDetails.bannerImage || null,
        coverImage: tmdbData?.details?.poster_url || tmdbData?.details?.poster_url_original || anilistDetails.coverImage || null,
        description: anilistDetails.description || '',
        episodes: anilistDetails.episodes,
        status: anilistDetails.status,
        aired: anilistDetails.aired || '',
        premiered: anilistDetails.premiered || '',
        studios: anilistDetails.studios || 'Unknown',
        genres: anilistDetails.genres || [],
        duration: anilistDetails.duration || null,
        rating: anilistDetails.rating,
        popularity: anilistDetails.popularity,
        trailer: anilistDetails.trailer || (tmdbData?.details?.videos?.[0] ? {
            id: tmdbData.details.videos[0].key,
            site: tmdbData.details.videos[0].site
        } : null),
        externalLinks: anilistDetails.externalLinks,
        streamingLinks: anilistDetails.streamingLinks || [],
        format: anilistDetails.format,
        seasons: tmdbData?.seasons?.seasons || [],
        latestSeasonEpisodes: tmdbData?.latestSeasonEpisodes || null,
        videos: tmdbData?.details?.videos || []
    }

    // Fetch similar anime from AniList (guaranteed to be anime)
    let similar: any[] = []
    try {
        const anilistSimilar = await fetchSimilarAnime(anilistId, 12)
        similar = await Promise.all(anilistSimilar.map(async (anime: any) => {
            const image = await getVerifiedTMDBImage(anime.id, anime.image)
            return {
                id: anime.id,
                title: anime.title,
                image,
                rating: anime.rating
            }
        }))
    } catch (error) {
        console.error('[Unified] Error fetching similar anime:', error)
    }

    // Fetch popular anime from AniList
    let popular: any[] = []
    try {
        const anilistPopular = await fetchPopularAnime(4)
        popular = await Promise.all(anilistPopular.map(async (anime: any) => {
            const image = await getVerifiedTMDBImage(anime.id, anime.image)
            return { ...anime, image }
        }))
    } catch (error) {
        console.error('[Unified] Error fetching popular anime:', error)
    }

    // Save to cache with unified_fetch = true
    try {
        await saveAnimeData(
            anilistId,
            mergedDetails,
            similar,
            popular,
            null, // AI description generated separately
            anilistDetails.description || '',
            true // unified_fetch = true
        )
        console.log(`[Unified] Saved data for "${mergedDetails.title}" (AniList ID: ${anilistId})`)
    } catch (error) {
        console.error(`[Unified] Error saving data:`, error)
    }

    return {
        details: mergedDetails,
        similar_anime: similar,
        popular_anime: popular,
        ai_description: null
    }
}
