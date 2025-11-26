import { NextResponse } from 'next/server'
import { unslugify } from '@/lib/utils/slugify'
import { fetchFullAnimeDetails, fetchSimilarAnime } from '@/lib/anilist'
import { searchTMDBAnime, getTMDBShowDetails, getTMDBImages, getTMDBSeasonDetails, getTMDBSeasons } from '@/lib/tmdb'

/**
 * DEVELOPMENT ONLY: Compare AniList and TMDB data for an anime
 * This endpoint is used for evaluating TMDB vs AniList data quality
 *
 * Usage: GET /api/anime/tmdb-compare/one-piece
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const searchTerm = unslugify(slug)


        // Fetch from both APIs in parallel
        const [anilistData, tmdbSearchResults] = await Promise.allSettled([
            // AniList data
            (async () => {
                const details = await fetchFullAnimeDetails(searchTerm)
                const similar = await fetchSimilarAnime(details.id, 4)
                return { details, similar }
            })(),

            // TMDB search
            searchTMDBAnime(searchTerm, 3)
        ])

        // Process AniList results
        const anilist = anilistData.status === 'fulfilled' ? anilistData.value : null
        const anilistError = anilistData.status === 'rejected' ? anilistData.reason : null

        // Process TMDB search results
        const tmdbSearch = tmdbSearchResults.status === 'fulfilled' ? tmdbSearchResults.value : null
        const tmdbSearchError = tmdbSearchResults.status === 'rejected' ? tmdbSearchResults.reason : null

        // If we found TMDB results, get detailed data for the first match
        let tmdbDetails = null
        let tmdbImages = null
        let tmdbSeasons = null
        let tmdbFirstSeason = null
        let tmdbDetailsError = null

        if (tmdbSearch && tmdbSearch.length > 0) {
            const bestMatch = tmdbSearch[0] // Take first result as best match
            try {
                [tmdbDetails, tmdbImages, tmdbSeasons] = await Promise.all([
                    getTMDBShowDetails(bestMatch.tmdb_id),
                    getTMDBImages(bestMatch.tmdb_id),
                    getTMDBSeasons(bestMatch.tmdb_id)
                ])

                // If there are seasons, fetch the first season's episodes as a sample
                if (tmdbSeasons && tmdbSeasons.seasons.length > 0) {
                    const firstSeasonNum = tmdbSeasons.seasons.find(s => s.season_number >= 1)?.season_number || 1
                    tmdbFirstSeason = await getTMDBSeasonDetails(bestMatch.tmdb_id, firstSeasonNum)
                }
            } catch (error) {
                tmdbDetailsError = error
                console.error('Error fetching TMDB details:', error)
            }
        }

        // Build comparison response
        const comparison = {
            query: searchTerm,
            slug,
            fetched_at: new Date().toISOString(),

            // AniList Data
            anilist: anilist ? {
                success: true,
                details: {
                    id: anilist.details.id,
                    title: anilist.details.title,
                    englishTitle: anilist.details.englishTitle,
                    bannerImage: anilist.details.bannerImage,
                    coverImage: anilist.details.coverImage,
                    description: anilist.details.description,
                    descriptionLength: anilist.details.description?.length || 0,
                    episodes: anilist.details.episodes,
                    status: anilist.details.status,
                    aired: anilist.details.aired,
                    premiered: anilist.details.premiered,
                    studios: anilist.details.studios,
                    genres: anilist.details.genres,
                    duration: anilist.details.duration,
                    rating: anilist.details.rating,
                    trailer: anilist.details.trailer,
                    externalLinks: anilist.details.externalLinks
                },
                similar: anilist.similar,
                episodeData: {
                    streamingEpisodes: anilist.details.streamingEpisodes || [],
                    streamingEpisodesCount: anilist.details.streamingEpisodes?.length || 0,
                    airingSchedule: anilist.details.airingSchedule || [],
                    airingScheduleCount: anilist.details.airingSchedule?.length || 0,
                    note: 'AniList provides limited episode data: streamingEpisodes (only for legal streams) and airingSchedule (only airing times, no titles/thumbnails)'
                },
                imageAnalysis: {
                    coverImage: {
                        url: anilist.details.coverImage,
                        estimatedSize: '230x325 (large)',
                        availableResolutions: 1
                    },
                    bannerImage: {
                        url: anilist.details.bannerImage,
                        estimatedSize: '~1920x600',
                        availableResolutions: 1
                    }
                }
            } : {
                success: false,
                error: anilistError?.message || 'Failed to fetch from AniList'
            },

            // TMDB Data
            tmdb: tmdbDetails ? {
                success: true,
                search_results_count: tmdbSearch?.length || 0,
                best_match: tmdbSearch?.[0],
                details: {
                    tmdb_id: tmdbDetails.tmdb_id,
                    title: tmdbDetails.title,
                    original_title: tmdbDetails.original_title,
                    tagline: tmdbDetails.tagline,
                    overview: tmdbDetails.overview,
                    overviewLength: tmdbDetails.overview?.length || 0,
                    first_air_date: tmdbDetails.first_air_date,
                    last_air_date: tmdbDetails.last_air_date,
                    status: tmdbDetails.status,
                    number_of_episodes: tmdbDetails.number_of_episodes,
                    number_of_seasons: tmdbDetails.number_of_seasons,
                    episode_run_time: tmdbDetails.episode_run_time,
                    vote_average: tmdbDetails.vote_average,
                    vote_count: tmdbDetails.vote_count,
                    popularity: tmdbDetails.popularity,
                    genres: tmdbDetails.genres,
                    networks: tmdbDetails.networks,
                    origin_country: tmdbDetails.origin_country,
                    external_ids: tmdbDetails.external_ids,
                    videos: tmdbDetails.videos,
                    recommendations: tmdbDetails.recommendations,
                    similar: tmdbDetails.similar
                },
                episodeData: tmdbSeasons ? {
                    number_of_seasons: tmdbSeasons.number_of_seasons,
                    number_of_episodes: tmdbSeasons.number_of_episodes,
                    seasons: tmdbSeasons.seasons,
                    sample_season: tmdbFirstSeason ? {
                        season_number: tmdbFirstSeason.season_number,
                        name: tmdbFirstSeason.name,
                        episode_count: tmdbFirstSeason.episode_count,
                        first_5_episodes: tmdbFirstSeason.episodes.slice(0, 5).map(ep => ({
                            episode_number: ep.episode_number,
                            name: ep.name,
                            air_date: ep.air_date,
                            runtime: ep.runtime,
                            still_url: ep.still_url_w300,
                            overview: ep.overview?.substring(0, 100) + (ep.overview?.length > 100 ? '...' : '')
                        }))
                    } : null,
                    note: 'TMDB provides comprehensive episode data with titles, thumbnails (stills), air dates, runtime, and descriptions for ALL episodes'
                } : null,
                imageAnalysis: {
                    poster: {
                        path: tmdbDetails.poster_path,
                        url_w500: tmdbDetails.poster_url,
                        url_original: tmdbDetails.poster_url_original,
                        availableResolutions: 7, // w92, w154, w185, w342, w500, w780, original
                        allImages: tmdbImages?.posters?.length || 0
                    },
                    backdrop: {
                        path: tmdbDetails.backdrop_path,
                        url_w1280: tmdbDetails.backdrop_url,
                        url_original: tmdbDetails.backdrop_url_original,
                        availableResolutions: 4, // w300, w780, w1280, original
                        allImages: tmdbImages?.backdrops?.length || 0
                    },
                    logos: {
                        count: tmdbImages?.logos?.length || 0,
                        available: tmdbImages?.logos || []
                    },
                    episodeStills: {
                        availableResolutions: 4, // w92, w185, w300, original
                        note: 'Each episode has a still image (thumbnail) available in multiple resolutions'
                    }
                },
                all_images: tmdbImages
            } : {
                success: false,
                search_results_count: tmdbSearch?.length || 0,
                search_results: tmdbSearch,
                error: tmdbDetailsError?.message || tmdbSearchError?.message || 'No TMDB results found'
            },

            // Comparison Summary
            summary: {
                both_found: !!anilist && !!tmdbDetails,
                image_quality_winner: tmdbDetails ? 'TMDB (more resolutions + backdrops)' : 'AniList',
                metadata_winner: anilist && tmdbDetails ? 'TIE (different strengths)' : null,
                episode_data_winner: tmdbSeasons ? 'TMDB (comprehensive episode lists with titles, thumbnails, dates)' : 'Neither (no comprehensive episode data)',
                episode_data_comparison: {
                    anilist: {
                        has_episode_titles: false,
                        has_episode_thumbnails: (anilist?.details?.streamingEpisodes?.length || 0) > 0 ? 'Limited (only streaming platforms)' : false,
                        has_episode_air_dates: (anilist?.details?.airingSchedule?.length || 0) > 0 ? 'Limited (only airing times)' : false,
                        comprehensive: false
                    },
                    tmdb: {
                        has_episode_titles: !!tmdbSeasons,
                        has_episode_thumbnails: !!tmdbSeasons,
                        has_episode_air_dates: !!tmdbSeasons,
                        has_episode_runtime: !!tmdbSeasons,
                        has_episode_descriptions: !!tmdbSeasons,
                        comprehensive: !!tmdbSeasons
                    }
                },
                recommendations: {
                    use_for_display: tmdbDetails ? 'TMDB (better images)' : 'AniList',
                    use_for_ai_ml: 'AniList ONLY (TMDB prohibits AI/ML)',
                    use_for_episode_lists: tmdbSeasons ? 'TMDB (comprehensive episode data)' : 'Not available',
                    suggested_approach: 'Hybrid: AniList for AI, TMDB for images + episode lists'
                }
            }
        }

        return NextResponse.json(comparison)

    } catch (error) {
        console.error('Error in TMDB comparison:', error)
        return NextResponse.json(
            { error: 'Failed to fetch comparison data', details: String(error) },
            { status: 500 }
        )
    }
}
