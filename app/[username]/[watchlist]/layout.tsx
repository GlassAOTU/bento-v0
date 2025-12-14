import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server-client'

interface LayoutProps {
    children: React.ReactNode
    params: Promise<{ username: string; watchlist: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ username: string; watchlist: string }> }): Promise<Metadata> {
    const { username, watchlist: watchlistSlug } = await params
    const supabase = await createClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, username, display_name')
        .eq('username', username.toLowerCase())
        .single()

    if (!profile) {
        return {
            title: 'Watchlist Not Found',
        }
    }

    const { data: watchlist } = await supabase
        .from('watchlists')
        .select('name, description, cover_image_url, is_public')
        .eq('user_id', profile.user_id)
        .eq('slug', watchlistSlug.toLowerCase())
        .single()

    if (!watchlist || !watchlist.is_public) {
        return {
            title: 'Watchlist Not Found',
        }
    }

    const title = `${watchlist.name} - ${profile.display_name || profile.username}'s Watchlist`
    const description = watchlist.description || `Check out ${profile.display_name || profile.username}'s anime watchlist`
    const ogImage = watchlist.cover_image_url || '/images/defaultwatchlistdisplay.png'

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [ogImage],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
    }
}

export default function WatchlistLayout({ children }: LayoutProps) {
    return children
}
