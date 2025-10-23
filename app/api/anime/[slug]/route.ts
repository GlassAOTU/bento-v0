import { NextResponse } from 'next/server'
import { unslugify } from '@/lib/utils/slugify'
import { getCachedAnimeDetails, getCachedSimilarAnime, getCachedPopularAnime } from '@/lib/cache/anime-cache'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const searchTerm = unslugify(slug)

        // Fetch anime details
        const details = await getCachedAnimeDetails(searchTerm)

        // Fetch similar and popular anime in parallel
        const [similar, popular] = await Promise.all([
            getCachedSimilarAnime(details.id, 4),
            getCachedPopularAnime(4)
        ])

        return NextResponse.json({
            details,
            similar,
            popular
        })
    } catch (error) {
        console.error('Error fetching anime data:', error)
        return NextResponse.json(
            { error: 'Failed to fetch anime data' },
            { status: 500 }
        )
    }
}
