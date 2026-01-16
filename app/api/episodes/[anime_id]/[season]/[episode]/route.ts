import { NextResponse } from 'next/server'
import { getEpisode } from '@/lib/supabase/episode-data'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ anime_id: string; season: string; episode: string }> }
) {
    try {
        const { anime_id, season, episode } = await params

        const animeId = parseInt(anime_id, 10)
        const seasonNumber = parseInt(season, 10)
        const episodeNumber = parseInt(episode, 10)

        if (isNaN(animeId) || isNaN(seasonNumber) || isNaN(episodeNumber)) {
            return NextResponse.json(
                { error: 'Invalid parameters' },
                { status: 400 }
            )
        }

        const episodeData = await getEpisode(animeId, seasonNumber, episodeNumber)

        if (!episodeData) {
            return NextResponse.json(
                { error: 'Episode not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ episode: episodeData })
    } catch (error) {
        console.error('Error fetching episode:', error)
        return NextResponse.json(
            { error: 'Failed to fetch episode' },
            { status: 500 }
        )
    }
}
