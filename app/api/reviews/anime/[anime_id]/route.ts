import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// GET /api/reviews/anime/[anime_id] - Get reviews for a specific anime
export async function GET(
    request: Request,
    { params }: { params: Promise<{ anime_id: string }> }
) {
    try {
        const { anime_id } = await params
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '20', 10)

        const supabase = await createClient()
        const animeIdInt = parseInt(anime_id, 10)

        if (isNaN(animeIdInt)) {
            return NextResponse.json(
                { error: 'Invalid anime_id' },
                { status: 400 }
            )
        }

        // Use the database function to get anime reviews
        const { data: reviews, error } = await supabase
            .rpc('get_anime_reviews', {
                target_anime_id: animeIdInt,
                limit_count: limit
            })

        if (error) {
            console.error('Error fetching anime reviews:', error)
            return NextResponse.json(
                { error: 'Failed to fetch reviews' },
                { status: 500 }
            )
        }

        return NextResponse.json({ reviews: reviews || [] })
    } catch (error) {
        console.error('Error fetching anime reviews:', error)
        return NextResponse.json(
            { error: 'Failed to fetch reviews' },
            { status: 500 }
        )
    }
}
