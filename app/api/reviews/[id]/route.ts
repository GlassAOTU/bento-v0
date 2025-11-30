import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// PATCH /api/reviews/[id] - Update a review
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { rating, review_text } = body

        // Build update object (only include provided fields)
        const updates: any = {}

        if (rating !== undefined) {
            // Validate rating range
            if (rating < 1 || rating > 5) {
                return NextResponse.json(
                    { error: 'Rating must be between 1 and 5' },
                    { status: 400 }
                )
            }
            updates.rating = rating
        }

        if (review_text !== undefined) {
            // Validate review text length
            if (review_text.length < 10 || review_text.length > 2000) {
                return NextResponse.json(
                    { error: 'Review text must be between 10 and 2000 characters' },
                    { status: 400 }
                )
            }
            updates.review_text = review_text
        }

        // Nothing to update
        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: 'No fields to update' },
                { status: 400 }
            )
        }

        // Update review (RLS policy ensures user can only update their own)
        const { data: review, error: updateError } = await supabase
            .from('reviews')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating review:', updateError)
            return NextResponse.json(
                { error: 'Failed to update review' },
                { status: 500 }
            )
        }

        if (!review) {
            return NextResponse.json(
                { error: 'Review not found or unauthorized' },
                { status: 404 }
            )
        }

        return NextResponse.json({ review })
    } catch (error) {
        console.error('Error updating review:', error)
        return NextResponse.json(
            { error: 'Failed to update review' },
            { status: 500 }
        )
    }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Delete review (RLS policy ensures user can only delete their own)
        const { error: deleteError } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (deleteError) {
            console.error('Error deleting review:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete review' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting review:', error)
        return NextResponse.json(
            { error: 'Failed to delete review' },
            { status: 500 }
        )
    }
}
