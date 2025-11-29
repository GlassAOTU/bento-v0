import { NextResponse } from 'next/server'
import { unslugify } from '@/lib/utils/slugify'
import { fetchPopularAnime, searchAnime, fetchFullAnimeDetails, fetchSimilarAnime } from '@/lib/anilist'
import { getTMDBAnimeDetails, findTMDBAnimeByTitle, getTMDBImageUrl, TMDB_POSTER_SIZES } from '@/lib/tmdb'
import { getAnimeData, shouldRefresh, saveAnimeData } from '@/lib/supabase/anime-data'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const searchTerm = unslugify(slug)

        // First, try to find the anime ID from either TMDB or AniList to check cache
        let animeId: number | null = null
        let cachedData = null

        // Try TMDB first to get ID
        try {
            const tmdbId = await findTMDBAnimeByTitle(searchTerm)
            if (tmdbId) {
                animeId = tmdbId
                cachedData = await getAnimeData(animeId)
            }
        } catch (error) {
            // Silent fail, will try AniList
        }

        // If no TMDB match or cache, try AniList ID
        if (!cachedData) {
            try {
                const anilistResults = await searchAnime(searchTerm, 1)
                if (anilistResults && anilistResults.length > 0) {
                    animeId = anilistResults[0].id
                    if (animeId) {
                        cachedData = await getAnimeData(animeId)
                    }
                }
            } catch (error) {
                // Silent fail
            }
        }

        // If we have fresh cached data, return it
        if (cachedData && !shouldRefresh(cachedData.last_fetched, cachedData.status)) {
            console.log(`Using cached data for "${searchTerm}" (ID: ${animeId})`)
            return NextResponse.json({
                details: cachedData.details,
                similar: cachedData.similar_anime,
                popular: cachedData.popular_anime,
                seasons: cachedData.details.seasons || [],
                latestSeasonEpisodes: cachedData.details.latestSeasonEpisodes || null,
                videos: cachedData.details.videos || [],
                aiDescription: cachedData.ai_description,
                tmdbId: cachedData.details.id || animeId,
                dataSource: 'Cache'
            })
        }

        // Cache is stale or doesn't exist, fetch fresh data
        console.log(`Fetching fresh data for "${searchTerm}"`)

        // Try to fetch anime data from TMDB first
        let tmdbData
        let isUsingTMDB = true
        try {
            tmdbData = await getTMDBAnimeDetails(searchTerm)
        } catch (error) {
            console.log(`TMDB not found for "${searchTerm}", falling back to AniList`)
            isUsingTMDB = false
        }

        // If TMDB failed, use AniList as fallback
        let details, latestSeasonEpisodes = null, seasons = [], videos: any[] = []

        if (isUsingTMDB && tmdbData) {
            // Format TMDB details
            details = {
                id: tmdbData.tmdb_id,
                title: tmdbData.details.title,
                romajiTitle: tmdbData.details.original_title,
                bannerImage: tmdbData.details.backdrop_url_original || tmdbData.details.backdrop_url || '',
                coverImage: tmdbData.details.poster_url || '',
                description: tmdbData.details.overview || '',
                episodes: tmdbData.details.number_of_episodes,
                seasons: tmdbData.details.number_of_seasons,
                status: tmdbData.details.status,
                aired: `${tmdbData.details.first_air_date || 'Unknown'} to ${tmdbData.details.last_air_date || 'Ongoing'}`,
                premiered: tmdbData.details.first_air_date,
                studios: tmdbData.details.networks?.map((n: any) => n.name).join(', ') || 'Unknown',
                genres: tmdbData.details.genres?.map((g: any) => g.name) || [],
                duration: tmdbData.details.episode_run_time?.[0] ? `${tmdbData.details.episode_run_time[0]} min per ep` : null,
                rating: Math.round(tmdbData.details.vote_average * 10), // Convert 0-10 to 0-100
                trailer: tmdbData.details.videos?.[0] ? {
                    id: tmdbData.details.videos[0].key,
                    site: tmdbData.details.videos[0].site
                } : null,
                externalLinks: tmdbData.details.external_ids?.imdb_id ? {
                    url: `https://www.imdb.com/title/${tmdbData.details.external_ids.imdb_id}`,
                    site: 'IMDB'
                } : null
            }

            latestSeasonEpisodes = tmdbData.latestSeasonEpisodes
            seasons = tmdbData.seasons?.seasons || []
            videos = tmdbData.details.videos || []
        } else {
            // Fallback to AniList
            try {
                const anilistDetails = await fetchFullAnimeDetails(searchTerm)

                // Try to get TMDB images even for AniList anime
                let tmdbImage = anilistDetails.coverImage
                let tmdbBanner = anilistDetails.bannerImage
                try {
                    const tmdbId = await findTMDBAnimeByTitle(anilistDetails.title)
                    if (tmdbId) {
                        const { searchTMDBAnime } = await import('@/lib/tmdb')
                        const tmdbResults = await searchTMDBAnime(anilistDetails.title, 1)
                        if (tmdbResults && tmdbResults.length > 0) {
                            tmdbImage = getTMDBImageUrl(tmdbResults[0].poster_path, TMDB_POSTER_SIZES.W500) || anilistDetails.coverImage
                            tmdbBanner = getTMDBImageUrl(tmdbResults[0].backdrop_path, 'original') || anilistDetails.bannerImage
                        }
                    }
                } catch (err) {
                    // Silent fail, use AniList images
                }

                details = {
                    ...anilistDetails,
                    coverImage: tmdbImage,
                    bannerImage: tmdbBanner
                }
            } catch (error) {
                return NextResponse.json(
                    { error: 'Anime not found in either TMDB or AniList' },
                    { status: 404 }
                )
            }
        }

        // Update animeId to the one we'll use for this data
        animeId = isUsingTMDB && tmdbData ? tmdbData.tmdb_id : details.id

        // Get similar anime from AniList first (guaranteed to be anime)
        // Then try to match with TMDB for better images
        let similar = []
        try {
            // Search AniList for the anime to get its ID
            const anilistResults = await searchAnime(searchTerm, 1)
            if (anilistResults && anilistResults.length > 0) {
                const anilistId = anilistResults[0].id

                // Fetch similar anime from AniList
                const anilistSimilar = await fetchSimilarAnime(anilistId, 6)

                // For each similar anime, try to find TMDB match for better images
                similar = await Promise.all(anilistSimilar.map(async (anime: any) => {
                    try {
                        // Try to find TMDB match
                        const tmdbId = await findTMDBAnimeByTitle(anime.title)
                        if (tmdbId) {
                            // Get TMDB details for the image
                            const { searchTMDBAnime } = await import('@/lib/tmdb')
                            const tmdbResults = await searchTMDBAnime(anime.title, 1)
                            if (tmdbResults && tmdbResults.length > 0) {
                                return {
                                    id: anime.id,
                                    title: anime.title,
                                    image: tmdbResults[0].poster_path
                                        ? getTMDBImageUrl(tmdbResults[0].poster_path, TMDB_POSTER_SIZES.W500) || anime.image
                                        : anime.image,
                                    rating: anime.rating
                                }
                            }
                        }
                    } catch (err) {
                        console.log(`Could not find TMDB match for ${anime.title}`)
                    }

                    // Fallback to AniList image if TMDB not found
                    return {
                        id: anime.id,
                        title: anime.title,
                        image: anime.image,
                        rating: anime.rating
                    }
                }))
            }
        } catch (error) {
            console.error('Error fetching similar anime:', error)
            // Fallback to empty array if error
            similar = []
        }

        // Get popular anime from AniList (for AI/ML compliance) with TMDB images
        const anilistPopular = await fetchPopularAnime(4)
        const popular = await Promise.all(anilistPopular.map(async (anime: any) => {
            try {
                // Try to find TMDB match for better image
                const tmdbId = await findTMDBAnimeByTitle(anime.title)
                if (tmdbId) {
                    const { searchTMDBAnime } = await import('@/lib/tmdb')
                    const tmdbResults = await searchTMDBAnime(anime.title, 1)
                    if (tmdbResults && tmdbResults.length > 0) {
                        return {
                            ...anime,
                            image: tmdbResults[0].poster_path
                                ? getTMDBImageUrl(tmdbResults[0].poster_path, TMDB_POSTER_SIZES.W500) || anime.image
                                : anime.image
                        }
                    }
                }
            } catch (err) {
                // Silent fail, use original image
            }
            return anime
        }))

        // Save the hybrid data to cache (without waiting)
        // We'll save with the existing AI description if we had one from cache
        const aiDescription = cachedData?.ai_description || null
        const originalDescription = details.description || ''

        // Enrich details with episode data for caching
        const enrichedDetails = {
            ...details,
            seasons: seasons,
            latestSeasonEpisodes: latestSeasonEpisodes,
            videos: videos
        }

        // Save to Supabase in background (don't await)
        if (animeId) {
            saveAnimeData(
                animeId,
                enrichedDetails,
                similar,
                popular,
                aiDescription,
                originalDescription
            ).then(success => {
                if (success) {
                    console.log(`Saved hybrid data for "${details.title}" (ID: ${animeId})`)
                } else {
                    console.error(`Failed to save data for "${details.title}" (ID: ${animeId})`)
                }
            })
        }

        // Return response with episode data
        return NextResponse.json({
            details,
            similar,
            popular,
            seasons: seasons,
            latestSeasonEpisodes: latestSeasonEpisodes,
            videos: videos,
            aiDescription: aiDescription,
            tmdbId: isUsingTMDB && tmdbData ? tmdbData.tmdb_id : null,
            dataSource: isUsingTMDB ? 'TMDB' : 'AniList' // For debugging
        })

    } catch (error) {
        console.error('Error in anime API route:', error)
        return NextResponse.json(
            { error: 'Failed to fetch anime data' },
            { status: 500 }
        )
    }
}
