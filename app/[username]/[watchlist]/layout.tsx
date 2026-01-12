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

    const displayName = profile.display_name || profile.username
    const title = `${watchlist.name} - ${displayName}'s Watchlist | Bento Anime`
    const description = watchlist.description || `Check out ${displayName}'s curated anime watchlist on Bento Anime`
    const ogImage = watchlist.cover_image_url || '/images/defaultwatchlistdisplay.png'
    const canonicalUrl = `https://bentoanime.com/${profile.username}/${watchlistSlug}`

    return {
        title,
        description,
        keywords: ['anime watchlist', 'anime list', `${displayName} watchlist`, 'curated anime', watchlist.name],
        openGraph: {
            title: `${watchlist.name} by ${displayName}`,
            description,
            images: [{ url: ogImage, width: 634, height: 280, alt: watchlist.name }],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            site: '@animebento',
            title: `${watchlist.name} by ${displayName}`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: canonicalUrl,
        },
    }
}

export default function WatchlistLayout({ children }: LayoutProps) {
    return children
}
