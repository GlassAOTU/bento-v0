import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service-client'
import { getTMDBAnimeDetails } from '@/lib/tmdb'

type EnhancedData = {
    image: string
    englishTitle: string | null
}

async function getEnhancedAnimeData(title: string, fallbackImage: string, supabase: any): Promise<EnhancedData> {
    let englishTitle: string | null = null

    try {
        const { data: cachedAnime } = await supabase
            .from('anime_data')
            .select('details')
            .ilike('details->>title', title)
            .limit(1)
            .single()

        if (cachedAnime?.details) {
            englishTitle = cachedAnime.details.title?.english || null
            if (cachedAnime.details.bannerImage) {
                return { image: cachedAnime.details.bannerImage, englishTitle }
            }
        }

        const tmdbData = await getTMDBAnimeDetails(title)
        if (tmdbData?.details) {
            if (!englishTitle && tmdbData.details.name) {
                englishTitle = tmdbData.details.name
            }
            if (tmdbData.details.backdrop_url_original) {
                return { image: tmdbData.details.backdrop_url_original, englishTitle }
            }
            if (tmdbData.details.backdrop_url) {
                return { image: tmdbData.details.backdrop_url, englishTitle }
            }
        }
    } catch (err) {
        console.log(`Could not fetch enhanced data for "${title}", using fallback`)
    }

    return { image: fallbackImage, englishTitle }
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
            sorted.map(async (anime) => {
                const data = await getEnhancedAnimeData(anime.title, anime.image, supabase)
                return {
                    ...anime,
                    title: data.englishTitle || anime.title,
                    image: data.image
                }
            })
        )

        return NextResponse.json({ popular: enhanced })
    } catch (error) {
        console.error('Error in popular anime API:', error)
        return NextResponse.json({ error: 'Failed to fetch popular anime' }, { status: 500 })
    }
}
