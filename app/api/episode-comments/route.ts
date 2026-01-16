import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { episode_id, comment_text } = body

        if (!episode_id || !comment_text) {
            return NextResponse.json(
                { error: 'episode_id and comment_text are required' },
                { status: 400 }
            )
        }

        if (comment_text.length < 1 || comment_text.length > 2000) {
            return NextResponse.json(
                { error: 'Comment must be between 1 and 2000 characters' },
                { status: 400 }
            )
        }

        const { data: comment, error: insertError } = await supabase
            .from('episode_comments')
            .insert({
                user_id: user.id,
                episode_id,
                comment_text
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating comment:', insertError)
            return NextResponse.json(
                { error: 'Failed to create comment' },
                { status: 500 }
            )
        }

        return NextResponse.json({ comment }, { status: 201 })
    } catch (error) {
        console.error('Error creating comment:', error)
        return NextResponse.json(
            { error: 'Failed to create comment' },
            { status: 500 }
        )
    }
}
