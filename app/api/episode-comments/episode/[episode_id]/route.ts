import { NextResponse } from 'next/server'
import { getEpisodeComments } from '@/lib/supabase/episode-data'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ episode_id: string }> }
) {
    try {
        const { episode_id } = await params
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '20', 10)
        const sort = searchParams.get('sort') as 'newest' | 'oldest' || 'newest'

        if (!episode_id) {
            return NextResponse.json(
                { error: 'episode_id is required' },
                { status: 400 }
            )
        }

        const comments = await getEpisodeComments(episode_id, limit, sort)

        return NextResponse.json({ comments })
    } catch (error) {
        console.error('Error fetching episode comments:', error)
        return NextResponse.json(
            { error: 'Failed to fetch comments' },
            { status: 500 }
        )
    }
}
