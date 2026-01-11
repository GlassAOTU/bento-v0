import { NextResponse } from 'next/server'
import { unslugify } from '@/lib/utils/slugify'
import { fetchPopularAnime, searchAnime, fetchFullAnimeDetails, fetchSimilarAnime, fetchAnimeById } from '@/lib/anilist'
import { getTMDBAnimeDetails, findTMDBAnimeByTitle, getTMDBImageUrl, TMDB_POSTER_SIZES, TMDB_BACKDROP_SIZES, searchTMDBAnime } from '@/lib/tmdb'
import { getAnimeData, shouldRefresh, saveAnimeData } from '@/lib/supabase/anime-data'
import { getTMDBByTitle, getTMDBByAnilistId, getAnilistBySearchTerm } from '@/lib/anime-mappings'
import { getTMDBIdFromARM } from '@/lib/arm-api'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const searchTerm = unslugify(slug)
        const url = new URL(request.url)
        const forceRefresh = url.searchParams.get('force') === 'true'

        console.log(`Fetching anime data for: "${searchTerm}"${forceRefresh ? ' (force refresh)' : ''}`)

        // STEP 1: Use AniList as source of truth for anime identification
        // This guarantees we get actual anime, not similarly-named non-anime content
        let anilistId: number | null = null
        let anilistDetails: any = null

        // Check manual mappings first (most reliable for known problematic titles)
        const directAnilistId = getAnilistBySearchTerm(searchTerm)
        if (directAnilistId) {
            anilistId = directAnilistId
            console.log(`Using manual mapping for "${searchTerm}": AniList ID ${anilistId}`)
        } else {
            // Fall back to AniList search
            try {
                const anilistResults = await searchAnime(searchTerm, 1)
                if (anilistResults && anilistResults.length > 0) {
                    anilistId = anilistResults[0].id
                    console.log(`Found AniList match via search: ID ${anilistId}`)
                }
            } catch (error) {
                console.error('Error searching AniList:', error)
            }
        }

        if (!anilistId) {
            return NextResponse.json(
                { error: `Anime not found: ${searchTerm}` },
                { status: 404 }
            )
        }

        // STEP 2: Check cache using AniList ID (source of truth)
        let cachedData = forceRefresh ? null : await getAnimeData(anilistId)

        if (cachedData && !shouldRefresh(cachedData.last_fetched, cachedData.status) && !forceRefresh) {
            console.log(`Using cached data for "${searchTerm}" (AniList ID: ${anilistId})`)

            let details = cachedData.details
            // Ensure streaming links are present
            if (!details.streamingLinks || details.streamingLinks.length === 0) {
                try {
                    const freshAnilist = await fetchFullAnimeDetails(searchTerm)
                    if (freshAnilist.streamingLinks && freshAnilist.streamingLinks.length > 0) {
                        details = { ...details, streamingLinks: freshAnilist.streamingLinks }
                        saveAnimeData(
                            anilistId,
                            details,
                            cachedData.similar_anime,
                            cachedData.popular_anime,
                            cachedData.ai_description,
                            cachedData.original_description
                        )
                    }
                } catch (err) {
                    // Silent fail
                }
            }

            return NextResponse.json({
                details,
                similar: cachedData.similar_anime,
                popular: cachedData.popular_anime,
                seasons: cachedData.details.seasons || [],
                latestSeasonEpisodes: cachedData.details.latestSeasonEpisodes || null,
                videos: cachedData.details.videos || [],
                aiDescription: cachedData.ai_description,
                tmdbId: cachedData.details.tmdbId || null,
                dataSource: 'Cache'
            })
        }

        // STEP 3: Fetch fresh AniList data (this is our base data)
        // Use fetchAnimeById when we have a manual mapping (most reliable)
        // Otherwise fall back to search-based fetch
        console.log(`Fetching fresh AniList data for "${searchTerm}" (ID: ${anilistId})`)
        try {
            if (directAnilistId) {
                // Use direct ID fetch for manual mappings (bypasses search issues)
                anilistDetails = await fetchAnimeById(directAnilistId)
                console.log(`Fetched by ID: "${anilistDetails.title}"`)
            } else {
                // Fall back to search-based fetch
                anilistDetails = await fetchFullAnimeDetails(searchTerm)
            }
        } catch (error) {
            console.error('Error fetching AniList details:', error)
            return NextResponse.json(
                { error: `Failed to fetch anime details: ${searchTerm}` },
                { status: 500 }
            )
        }

        // STEP 4: Try to enhance with TMDB images (optional enhancement only)
        let tmdbId: number | null = null
        let tmdbImages: { coverImage?: string, bannerImage?: string } = {}
        let tmdbData: any = null

        // Check manual mappings first (most reliable for known problematic titles)
        const manualMapping = getTMDBByAnilistId(anilistId) || getTMDBByTitle(searchTerm)
        if (manualMapping) {
            tmdbId = manualMapping.tmdbId
            console.log(`Using manual mapping: AniList ${anilistId} -> TMDB ${tmdbId} (${manualMapping.type})`)

            try {
                tmdbData = await getTMDBAnimeDetails(tmdbId, anilistId)
                if (tmdbData?.details) {
                    tmdbImages.coverImage = tmdbData.details.poster_url || tmdbData.details.poster_url_original
                    tmdbImages.bannerImage = tmdbData.details.backdrop_url_original || tmdbData.details.backdrop_url
                }
            } catch (err) {
                console.log(`Could not fetch TMDB details for manual mapping: ${err}`)
            }
        } else {
            // Try automatic TMDB matching with stricter filter
            try {
                const foundTmdbId = await findTMDBAnimeByTitle(anilistDetails.title, anilistId)
                if (foundTmdbId) {
                    tmdbData = await getTMDBAnimeDetails(foundTmdbId, anilistId)
                    if (tmdbData?.details) {
                        tmdbId = foundTmdbId
                        tmdbImages.coverImage = tmdbData.details.poster_url || tmdbData.details.poster_url_original
                        tmdbImages.bannerImage = tmdbData.details.backdrop_url_original || tmdbData.details.backdrop_url
                    }
                }
            } catch (err) {
                // Title search failed, will try ARM fallback
            }

            // Fallback to ARM (Anime Relations Mapping) API if title search failed
            if (!tmdbId) {
                try {
                    const armTmdbId = await getTMDBIdFromARM(anilistId)
                    if (armTmdbId) {
                        tmdbData = await getTMDBAnimeDetails(armTmdbId, anilistId)
                        if (tmdbData?.details) {
                            tmdbId = armTmdbId
                            tmdbImages.coverImage = tmdbData.details.poster_url || tmdbData.details.poster_url_original
                            tmdbImages.bannerImage = tmdbData.details.backdrop_url_original || tmdbData.details.backdrop_url
                        }
                    }
                } catch (err) {
                    // ARM lookup failed
                }
            }
        }

        // STEP 5: Build final details using AniList as base, enhanced with TMDB images
        const details = {
            id: anilistId,
            tmdbId: tmdbId,
            title: anilistDetails.title,
            romajiTitle: anilistDetails.romajiTitle || anilistDetails.title,
            bannerImage: tmdbImages.bannerImage || anilistDetails.bannerImage || null,
            coverImage: tmdbImages.coverImage || anilistDetails.coverImage || null,
            description: anilistDetails.description || '',
            episodes: anilistDetails.episodes,
            seasons: tmdbData?.seasons?.number_of_seasons || anilistDetails.seasons || 1,
            status: anilistDetails.status,
            aired: anilistDetails.aired || '',
            premiered: anilistDetails.premiered || '',
            studios: anilistDetails.studios || 'Unknown',
            genres: anilistDetails.genres || [],
            duration: anilistDetails.duration || null,
            rating: anilistDetails.rating,
            trailer: anilistDetails.trailer || (tmdbData?.details?.videos?.[0] ? {
                id: tmdbData.details.videos[0].key,
                site: tmdbData.details.videos[0].site
            } : null),
            externalLinks: anilistDetails.externalLinks,
            streamingLinks: anilistDetails.streamingLinks || [],
            format: anilistDetails.format
        }

        // Get episode data from TMDB if available
        const latestSeasonEpisodes = tmdbData?.latestSeasonEpisodes || null
        const seasons = tmdbData?.seasons?.seasons || []
        const videos = tmdbData?.details?.videos || []

        // STEP 6: Get similar anime from AniList (guaranteed to be anime)
        let similar: any[] = []
        try {
            const anilistSimilar = await fetchSimilarAnime(anilistId, 12)
            similar = await Promise.all(anilistSimilar.map(async (anime: any) => {
                let image = anime.image
                try {
                    const tmdbResults = await searchTMDBAnime(anime.title, 1)
                    if (tmdbResults?.[0]?.poster_path) {
                        image = getTMDBImageUrl(tmdbResults[0].poster_path, TMDB_POSTER_SIZES.W500) || image
                    }
                } catch (err) {
                    // Keep AniList image as fallback
                }
                return {
                    id: anime.id,
                    title: anime.title,
                    image,
                    rating: anime.rating
                }
            }))
        } catch (error) {
            console.error('Error fetching similar anime:', error)
        }

        // STEP 7: Get popular anime from AniList
        let popular: any[] = []
        try {
            const anilistPopular = await fetchPopularAnime(4)
            popular = await Promise.all(anilistPopular.map(async (anime: any) => {
                let image = anime.image
                try {
                    const tmdbResults = await searchTMDBAnime(anime.title, 1)
                    if (tmdbResults?.[0]?.poster_path) {
                        image = getTMDBImageUrl(tmdbResults[0].poster_path, TMDB_POSTER_SIZES.W500) || image
                    }
                } catch (err) {
                    // Keep AniList image as fallback
                }
                return { ...anime, image }
            }))
        } catch (error) {
            console.error('Error fetching popular anime:', error)
        }

        // STEP 8: Save to cache using AniList ID
        const aiDescription = cachedData?.ai_description || null
        const originalDescription = details.description || ''

        const enrichedDetails = {
            ...details,
            seasons: seasons,
            latestSeasonEpisodes: latestSeasonEpisodes,
            videos: videos
        }

        try {
            await saveAnimeData(
                anilistId,
                enrichedDetails,
                similar,
                popular,
                aiDescription,
                originalDescription
            )
            console.log(`Saved data for "${details.title}" (AniList ID: ${anilistId})`)
        } catch (error) {
            console.error(`Error saving data for "${details.title}":`, error)
        }

        return NextResponse.json({
            details: enrichedDetails,
            similar,
            popular,
            seasons,
            latestSeasonEpisodes,
            videos,
            aiDescription,
            tmdbId,
            dataSource: 'AniList'
        })

    } catch (error) {
        console.error('Error in anime API route:', error)
        return NextResponse.json(
            { error: 'Failed to fetch anime data' },
            { status: 500 }
        )
    }
}
