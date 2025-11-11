import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// GET /api/reviews/user/[username] - Get reviews by username
export async function GET(
    request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '10', 10)

        const supabase = await createClient()

        // Use the database function to get user reviews
        const { data: reviews, error } = await supabase
            .rpc('get_user_reviews', {
                target_username: username.toLowerCase(),
                limit_count: limit
            })

        if (error) {
            console.error('Error fetching reviews:', error)
            return NextResponse.json(
                { error: 'Failed to fetch reviews' },
                { status: 500 }
            )
        }

        return NextResponse.json({ reviews: reviews || [] })
    } catch (error) {
        console.error('Error fetching reviews:', error)
        return NextResponse.json(
            { error: 'Failed to fetch reviews' },
            { status: 500 }
        )
    }
}
