import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ username: string; slug: string }> }
) {
    try {
        const { username, slug } = await params
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .eq('username', username.toLowerCase())
            .single()

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        const { data: watchlist, error: watchlistError } = await supabase
            .from('watchlists')
            .select('id, user_id, name, slug, description, is_public')
            .eq('user_id', profile.user_id)
            .eq('slug', slug.toLowerCase())
            .single()

        if (watchlistError || !watchlist) {
            return NextResponse.json(
                { error: 'Watchlist not found' },
                { status: 404 }
            )
        }

        const isOwner = user?.id === watchlist.user_id
        if (!watchlist.is_public && !isOwner) {
            return NextResponse.json(
                { error: 'This watchlist is private' },
                { status: 403 }
            )
        }

        const { data: items, error: itemsError } = await supabase
            .from('watchlist_items')
            .select('id, title, image, description, reason')
            .eq('watchlist_id', watchlist.id)
            .order('added_at', { ascending: false })

        if (itemsError) {
            console.error('Error fetching watchlist items:', itemsError)
        }

        return NextResponse.json({
            watchlist,
            items: items || [],
            profile: {
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url
            }
        })
    } catch (error) {
        console.error('Error fetching watchlist:', error)
        return NextResponse.json(
            { error: 'Failed to fetch watchlist' },
            { status: 500 }
        )
    }
}
