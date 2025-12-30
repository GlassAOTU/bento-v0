import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ anime_id: string }> }
) {
    try {
        const { anime_id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ review: null })
        }

        const animeIdInt = parseInt(anime_id, 10)

        if (isNaN(animeIdInt)) {
            return NextResponse.json(
                { error: 'Invalid anime_id' },
                { status: 400 }
            )
        }

        const { data: review, error } = await supabase
            .from('reviews')
            .select('id, rating, review_text, created_at, updated_at')
            .eq('user_id', user.id)
            .eq('anime_id', animeIdInt)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user review:', error)
            return NextResponse.json(
                { error: 'Failed to fetch review' },
                { status: 500 }
            )
        }

        return NextResponse.json({ review: review || null })
    } catch (error) {
        console.error('Error fetching user review:', error)
        return NextResponse.json(
            { error: 'Failed to fetch review' },
            { status: 500 }
        )
    }
}
