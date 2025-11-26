import { NextResponse } from 'next/server'
import { unslugify } from '@/lib/utils/slugify'
import { getTMDBAnimeDetails } from '@/lib/tmdb'

/**
 * Get anime details from TMDB
 * Usage: GET /api/anime/tmdb/one-piece
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const searchTerm = unslugify(slug)


        // Fetch comprehensive anime data from TMDB
        const tmdbData = await getTMDBAnimeDetails(searchTerm)

        if (!tmdbData) {
            return NextResponse.json(
                { error: 'Anime not found on TMDB' },
                { status: 404 }
            )
        }

        // Format the response for the frontend
        const response = {
            details: {
                id: tmdbData.tmdb_id,
                title: tmdbData.details.title,
                englishTitle: tmdbData.details.original_title,
                bannerImage: tmdbData.details.backdrop_url_original || tmdbData.details.backdrop_url,
                coverImage: tmdbData.details.poster_url,
                description: tmdbData.details.overview,
                episodes: tmdbData.details.number_of_episodes,
                seasons: tmdbData.details.number_of_seasons,
                status: tmdbData.details.status,
                aired: `${tmdbData.details.first_air_date} to ${tmdbData.details.last_air_date || 'Ongoing'}`,
                premiered: tmdbData.details.first_air_date,
                studios: tmdbData.details.networks?.map((n: any) => n.name).join(', ') || 'Unknown',
                genres: tmdbData.details.genres?.map((g: any) => g.name) || [],
                duration: tmdbData.details.episode_run_time?.[0] ? `${tmdbData.details.episode_run_time[0]} min per ep` : null,
                rating: Math.round(tmdbData.details.vote_average * 10), // Convert to 0-100 scale
                trailer: tmdbData.details.videos?.[0] ? {
                    id: tmdbData.details.videos[0].key,
                    site: tmdbData.details.videos[0].site
                } : null,
                externalLinks: {
                    url: tmdbData.details.external_ids?.imdb_id
                        ? `https://www.imdb.com/title/${tmdbData.details.external_ids.imdb_id}`
                        : null,
                    site: 'IMDB'
                }
            },
            seasons: tmdbData.seasons.seasons,
            latestSeasonEpisodes: tmdbData.latestSeasonEpisodes,
            images: {
                posters: tmdbData.images.posters?.slice(0, 10),
                backdrops: tmdbData.images.backdrops?.slice(0, 10),
                logos: tmdbData.images.logos
            }
        }

        return NextResponse.json(response)

    } catch (error) {
        console.error('Error fetching TMDB anime:', error)
        return NextResponse.json(
            { error: 'Failed to fetch anime data', details: String(error) },
            { status: 500 }
        )
    }
}
