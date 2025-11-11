import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// POST /api/follows - Follow a user
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
        const { following_id } = body

        // Validate required fields
        if (!following_id) {
            return NextResponse.json(
                { error: 'following_id is required' },
                { status: 400 }
            )
        }

        // Prevent self-follow
        if (following_id === user.id) {
            return NextResponse.json(
                { error: 'Cannot follow yourself' },
                { status: 400 }
            )
        }

        // Create follow relationship
        const { data: follow, error: insertError } = await supabase
            .from('follows')
            .insert({
                follower_id: user.id,
                following_id
            })
            .select()
            .single()

        if (insertError) {
            // Check if it's a unique constraint violation (already following)
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { error: 'Already following this user' },
                    { status: 409 }
                )
            }

            // Check if it's a foreign key violation (user doesn't exist)
            if (insertError.code === '23503') {
                return NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                )
            }

            console.error('Error creating follow:', insertError)
            return NextResponse.json(
                { error: 'Failed to follow user' },
                { status: 500 }
            )
        }

        return NextResponse.json({ follow }, { status: 201 })
    } catch (error) {
        console.error('Error creating follow:', error)
        return NextResponse.json(
            { error: 'Failed to follow user' },
            { status: 500 }
        )
    }
}
