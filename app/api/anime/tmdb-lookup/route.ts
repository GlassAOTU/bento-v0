import { NextRequest, NextResponse } from 'next/server'
import { searchTMDBAnime, getTMDBImageUrl, TMDB_POSTER_SIZES, TMDB_BACKDROP_SIZES } from '@/lib/tmdb'

/**
 * Quick TMDB lookup by title
 * Returns tmdb_id, poster_url, and backdrop_url if found
 *
 * Query params:
 * - title: The anime title to search for
 * - type: 'poster' | 'backdrop' (default: 'backdrop' for wide cards, 'poster' for square/portrait)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const title = searchParams.get('title')
    const imageType = searchParams.get('type') || 'backdrop' // Default to backdrop for wide cards

    if (!title) {
        return NextResponse.json(
            { error: 'Title parameter is required' },
            { status: 400 }
        )
    }

    try {
        const results = await searchTMDBAnime(title, 1)

        if (results && results.length > 0) {
            const match = results[0]
            const posterUrl = getTMDBImageUrl(match.poster_path, TMDB_POSTER_SIZES.W500)
            const backdropUrl = match.backdrop_path
                ? getTMDBImageUrl(match.backdrop_path, TMDB_BACKDROP_SIZES.W1280)
                : null

            return NextResponse.json({
                tmdb_id: match.tmdb_id,
                title: match.title,
                poster_url: posterUrl,
                backdrop_url: backdropUrl,
                // Primary image based on requested type
                image_url: imageType === 'poster' ? posterUrl : (backdropUrl || posterUrl)
            })
        }

        return NextResponse.json({
            tmdb_id: null,
            title: null,
            poster_url: null,
            backdrop_url: null,
            image_url: null
        })
    } catch (error) {
        console.error('TMDB lookup error:', error)
        return NextResponse.json(
            { error: 'Failed to lookup TMDB data' },
            { status: 500 }
        )
    }
}
