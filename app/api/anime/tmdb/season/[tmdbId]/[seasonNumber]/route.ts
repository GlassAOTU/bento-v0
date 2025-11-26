import { NextResponse } from 'next/server'
import { getTMDBSeasonDetails } from '@/lib/tmdb'

/**
 * Get season episodes from TMDB
 * Usage: GET /api/anime/tmdb/season/12345/1
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ tmdbId: string; seasonNumber: string }> }
) {
    try {
        const { tmdbId, seasonNumber } = await params
        const tmdbIdNum = parseInt(tmdbId)
        const seasonNum = parseInt(seasonNumber)

        if (isNaN(tmdbIdNum) || isNaN(seasonNum)) {
            return NextResponse.json(
                { error: 'Invalid TMDB ID or season number' },
                { status: 400 }
            )
        }

        const seasonData = await getTMDBSeasonDetails(tmdbIdNum, seasonNum)

        return NextResponse.json(seasonData)

    } catch (error) {
        console.error('Error fetching season episodes:', error)
        return NextResponse.json(
            { error: 'Failed to fetch season episodes', details: String(error) },
            { status: 500 }
        )
    }
}
