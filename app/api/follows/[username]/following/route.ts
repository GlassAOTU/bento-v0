import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// GET /api/follows/[username]/following - Get users that this user follows
export async function GET(
    request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50', 10)

        const supabase = await createClient()

        // Use the database function to get following
        const { data: following, error } = await supabase
            .rpc('get_following', {
                target_username: username.toLowerCase(),
                limit_count: limit
            })

        if (error) {
            console.error('Error fetching following:', error)
            return NextResponse.json(
                { error: 'Failed to fetch following' },
                { status: 500 }
            )
        }

        return NextResponse.json({ following: following || [] })
    } catch (error) {
        console.error('Error fetching following:', error)
        return NextResponse.json(
            { error: 'Failed to fetch following' },
            { status: 500 }
        )
    }
}
