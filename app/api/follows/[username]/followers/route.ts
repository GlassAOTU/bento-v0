import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// GET /api/follows/[username]/followers - Get user's followers
export async function GET(
    request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50', 10)

        const supabase = await createClient()

        // Use the database function to get followers
        const { data: followers, error } = await supabase
            .rpc('get_followers', {
                target_username: username.toLowerCase(),
                limit_count: limit
            })

        if (error) {
            console.error('Error fetching followers:', error)
            return NextResponse.json(
                { error: 'Failed to fetch followers' },
                { status: 500 }
            )
        }

        return NextResponse.json({ followers: followers || [] })
    } catch (error) {
        console.error('Error fetching followers:', error)
        return NextResponse.json(
            { error: 'Failed to fetch followers' },
            { status: 500 }
        )
    }
}
