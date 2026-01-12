import { NextResponse } from 'next/server'
import { unslugify } from '@/lib/utils/slugify'
import { getAnimeData, shouldRefresh, saveAnimeData } from '@/lib/supabase/anime-data'
import { getAnilistBySearchTerm } from '@/lib/anime-mappings'
import { resolveAnilistId, fetchUnifiedAnimeData } from '@/lib/anime-fetch'
import { fetchFullAnimeDetails } from '@/lib/anilist'

function formatResponse(data: any) {
    return {
        details: data.details,
        similar: data.similar_anime,
        popular: data.popular_anime,
        seasons: data.details?.seasons || [],
        latestSeasonEpisodes: data.details?.latestSeasonEpisodes || null,
        videos: data.details?.videos || [],
        aiDescription: data.ai_description,
        tmdbId: data.details?.tmdbId || null
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const searchTerm = unslugify(slug)
        const url = new URL(request.url)
        const forceRefresh = url.searchParams.get('force') === 'true'

        console.log(`[API] Fetching anime data for: "${searchTerm}"${forceRefresh ? ' (force refresh)' : ''}`)

        // STEP 1: Resolve AniList ID (source of truth)
        let anilistId: number | null = null

        const directAnilistId = getAnilistBySearchTerm(searchTerm)
        if (directAnilistId) {
            anilistId = directAnilistId
            console.log(`[API] Using manual mapping: AniList ID ${anilistId}`)
        } else {
            anilistId = await resolveAnilistId(searchTerm)
        }

        if (!anilistId) {
            return NextResponse.json(
                { error: `Anime not found: ${searchTerm}` },
                { status: 404 }
            )
        }

        // STEP 2: Check cache
        const cached = forceRefresh ? null : await getAnimeData(anilistId)
        const isStale = cached && shouldRefresh(
            cached.last_fetched,
            cached.status,
            cached.unified_fetch
        )

        // STEP 3: Return cached if fresh
        if (cached && !isStale) {
            console.log(`[API] Cache hit (fresh) for "${searchTerm}"`)

            // Ensure streaming links are present
            let details = cached.details
            if (!details.streamingLinks || details.streamingLinks.length === 0) {
                try {
                    const freshAnilist = await fetchFullAnimeDetails(searchTerm)
                    if (freshAnilist.streamingLinks && freshAnilist.streamingLinks.length > 0) {
                        details = { ...details, streamingLinks: freshAnilist.streamingLinks }
                        saveAnimeData(
                            anilistId,
                            details,
                            cached.similar_anime,
                            cached.popular_anime,
                            cached.ai_description,
                            cached.original_description,
                            cached.unified_fetch
                        )
                    }
                } catch {
                    // Silent fail
                }
            }

            return NextResponse.json({
                ...formatResponse({ ...cached, details }),
                dataSource: 'Cache'
            })
        }

        // STEP 4: Return stale + trigger background refresh
        if (cached && isStale) {
            console.log(`[API] Cache hit (stale) for "${searchTerm}" - triggering background refresh`)

            // Fire-and-forget background refresh
            fetchUnifiedAnimeData(anilistId).catch(err => {
                console.error(`[Background] Refresh failed for ${anilistId}:`, err)
            })

            return NextResponse.json({
                ...formatResponse(cached),
                dataSource: 'Cache (Stale)',
                isRefreshing: true
            })
        }

        // STEP 5: Cache miss - fetch fresh (blocking)
        console.log(`[API] Cache miss for "${searchTerm}" - fetching fresh data`)
        const freshData = await fetchUnifiedAnimeData(anilistId)

        // AI description will be fetched by client via /api/anime/description
        return NextResponse.json({
            ...formatResponse(freshData),
            dataSource: 'Fresh'
        })

    } catch (error) {
        console.error('[API] Error in anime route:', error)
        return NextResponse.json(
            { error: 'Failed to fetch anime data' },
            { status: 500 }
        )
    }
}
