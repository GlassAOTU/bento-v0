import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service-client'
import { getTMDBAnimeDetails } from '@/lib/tmdb'

async function getHighQualityImage(title: string, fallbackImage: string, supabase: any): Promise<string> {
    try {
        const { data: cachedAnime } = await supabase
            .from('anime_data')
            .select('details')
            .ilike('details->>title', title)
            .limit(1)
            .single()

        if (cachedAnime?.details?.bannerImage) {
            return cachedAnime.details.bannerImage
        }

        const tmdbData = await getTMDBAnimeDetails(title)
        if (tmdbData?.details?.backdrop_url_original) {
            return tmdbData.details.backdrop_url_original
        }
        if (tmdbData?.details?.backdrop_url) {
            return tmdbData.details.backdrop_url
        }
    } catch (err) {
        console.log(`Could not fetch high-res image for "${title}", using fallback`)
    }

    return fallbackImage
}

export async function GET() {
    try {
        const supabase = createServiceClient()

        const { data: publicWatchlists, error: watchlistsError } = await supabase
            .from('watchlists')
            .select('id')
            .eq('is_public', true)

        if (watchlistsError) {
            console.error('Error fetching public watchlists:', watchlistsError)
            return NextResponse.json({ error: 'Failed to fetch watchlists' }, { status: 500 })
        }

        if (!publicWatchlists || publicWatchlists.length === 0) {
            return NextResponse.json({ popular: [] })
        }

        const watchlistIds = publicWatchlists.map(w => w.id)

        const { data: items, error: itemsError } = await supabase
            .from('watchlist_items')
            .select('title, image, description')
            .in('watchlist_id', watchlistIds)

        if (itemsError) {
            console.error('Error fetching watchlist items:', itemsError)
            return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ popular: [] })
        }

        const titleCounts: Record<string, { count: number; image: string; description: string }> = {}

        for (const item of items) {
            const normalizedTitle = item.title.toLowerCase().trim()
            if (titleCounts[normalizedTitle]) {
                titleCounts[normalizedTitle].count++
            } else {
                titleCounts[normalizedTitle] = {
                    count: 1,
                    image: item.image || '',
                    description: item.description || ''
                }
            }
        }

        const sorted = Object.entries(titleCounts)
            .map(([title, data]) => ({
                title: items.find(i => i.title.toLowerCase().trim() === title)?.title || title,
                image: data.image,
                description: data.description,
                watchlistCount: data.count
            }))
            .sort((a, b) => b.watchlistCount - a.watchlistCount)
            .slice(0, 4)

        const enhanced = await Promise.all(
            sorted.map(async (anime) => ({
                ...anime,
                image: await getHighQualityImage(anime.title, anime.image, supabase)
            }))
        )

        return NextResponse.json({ popular: enhanced })
    } catch (error) {
        console.error('Error in popular anime API:', error)
        return NextResponse.json({ error: 'Failed to fetch popular anime' }, { status: 500 })
    }
}
