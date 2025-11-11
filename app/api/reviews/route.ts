import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// POST /api/reviews - Create a new review
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
        const { anime_id, rating, review_text } = body

        // Validate required fields
        if (!anime_id || !rating || !review_text) {
            return NextResponse.json(
                { error: 'anime_id, rating, and review_text are required' },
                { status: 400 }
            )
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5' },
                { status: 400 }
            )
        }

        // Validate review text length
        if (review_text.length < 10 || review_text.length > 2000) {
            return NextResponse.json(
                { error: 'Review text must be between 10 and 2000 characters' },
                { status: 400 }
            )
        }

        // Create review
        const { data: review, error: insertError } = await supabase
            .from('reviews')
            .insert({
                user_id: user.id,
                anime_id,
                rating,
                review_text
            })
            .select()
            .single()

        if (insertError) {
            // Check if it's a unique constraint violation (duplicate review)
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { error: 'You have already reviewed this anime' },
                    { status: 409 }
                )
            }

            console.error('Error creating review:', insertError)
            return NextResponse.json(
                { error: 'Failed to create review' },
                { status: 500 }
            )
        }

        return NextResponse.json({ review }, { status: 201 })
    } catch (error) {
        console.error('Error creating review:', error)
        return NextResponse.json(
            { error: 'Failed to create review' },
            { status: 500 }
        )
    }
}
