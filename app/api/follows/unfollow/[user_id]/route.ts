import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// DELETE /api/follows/unfollow/[user_id] - Unfollow a user
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ user_id: string }> }
) {
    try {
        const { user_id } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Delete follow relationship (RLS policy ensures user can only delete their own follows)
        const { error: deleteError } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', user_id)

        if (deleteError) {
            console.error('Error deleting follow:', deleteError)
            return NextResponse.json(
                { error: 'Failed to unfollow user' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting follow:', error)
        return NextResponse.json(
            { error: 'Failed to unfollow user' },
            { status: 500 }
        )
    }
}
