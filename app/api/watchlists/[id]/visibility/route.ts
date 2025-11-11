import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// PATCH /api/watchlists/[id]/visibility - Toggle watchlist visibility
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
        const { is_public } = body

        // Validate required field
        if (typeof is_public !== 'boolean') {
            return NextResponse.json(
                { error: 'is_public must be a boolean' },
                { status: 400 }
            )
        }

        // Update watchlist visibility (RLS policy ensures user can only update their own)
        const { data: watchlist, error: updateError } = await supabase
            .from('watchlists')
            .update({ is_public })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating watchlist visibility:', updateError)
            return NextResponse.json(
                { error: 'Failed to update watchlist visibility' },
                { status: 500 }
            )
        }

        if (!watchlist) {
            return NextResponse.json(
                { error: 'Watchlist not found or unauthorized' },
                { status: 404 }
            )
        }

        return NextResponse.json({ watchlist })
    } catch (error) {
        console.error('Error updating watchlist visibility:', error)
        return NextResponse.json(
            { error: 'Failed to update watchlist visibility' },
            { status: 500 }
        )
    }
}
