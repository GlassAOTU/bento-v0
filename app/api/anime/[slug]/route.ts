import { NextResponse } from 'next/server'
import { unslugify } from '@/lib/utils/slugify'
import { getAnimeData, shouldRefresh, saveAnimeData } from '@/lib/supabase/anime-data'
import { getAnilistBySearchTerm, getAnilistBySlug } from '@/lib/anime-mappings'
import { resolveAnilistId, fetchUnifiedAnimeData, isBrokenTMDBState } from '@/lib/anime-fetch'
import { fetchFullAnimeDetails } from '@/lib/anilist'
import { shouldRefreshEpisodes, saveEpisodes } from '@/lib/supabase/episode-data'
import { getAllTMDBEpisodes } from '@/lib/tmdb'

async function cacheEpisodesIfNeeded(animeId: number, tmdbId: number | null, format: string | null) {
    if (!tmdbId || format === 'MOVIE') return

    try {
        const needsRefresh = await shouldRefreshEpisodes(animeId)
        if (!needsRefresh) {
            console.log(`[Episodes] Cache fresh for anime ${animeId}`)
            return
        }

        console.log(`[Episodes] Fetching episodes for anime ${animeId} (TMDB ${tmdbId})`)
        const episodes = await getAllTMDBEpisodes(tmdbId)

        if (episodes.length > 0) {
            const saved = await saveEpisodes(animeId, episodes)
            console.log(`[Episodes] Cached ${episodes.length} episodes for anime ${animeId}: ${saved}`)
        }
    } catch (error) {
        console.error(`[Episodes] Failed to cache for anime ${animeId}:`, error)
    }
}

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

        // Check slug mapping first (for lossy slugs like "evangelion-3010")
        const slugMappedId = getAnilistBySlug(slug)
        if (slugMappedId) {
            anilistId = slugMappedId
            console.log(`[API] Using slug mapping: AniList ID ${anilistId}`)
        } else {
            const directAnilistId = getAnilistBySearchTerm(searchTerm)
            if (directAnilistId) {
                anilistId = directAnilistId
                console.log(`[API] Using search term mapping: AniList ID ${anilistId}`)
            } else {
                anilistId = await resolveAnilistId(searchTerm)
            }
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

            // Auto-recovery: If cache has broken TMDB state, trigger refetch
            if (isBrokenTMDBState(cached)) {
                console.log(`[API] Detected broken TMDB state for "${searchTerm}" - triggering auto-recovery`)
                const freshData = await fetchUnifiedAnimeData(anilistId, { existingCache: cached })
                cacheEpisodesIfNeeded(anilistId, freshData.details?.tmdbId, freshData.details?.format).catch(() => {})
                return NextResponse.json({
                    ...formatResponse(freshData),
                    dataSource: 'Auto-Recovery'
                })
            }

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

            // Trigger episode caching in background (non-blocking)
            cacheEpisodesIfNeeded(anilistId, details.tmdbId, details.format).catch(() => {})

            return NextResponse.json({
                ...formatResponse({ ...cached, details }),
                dataSource: 'Cache'
            })
        }

        // STEP 4: Return stale + trigger background refresh
        if (cached && isStale) {
            console.log(`[API] Cache hit (stale) for "${searchTerm}" - triggering background refresh`)

            // Fire-and-forget background refresh (pass existing cache for preservation)
            fetchUnifiedAnimeData(anilistId, { existingCache: cached }).catch(err => {
                console.error(`[Background] Refresh failed for ${anilistId}:`, err)
            })

            // Trigger episode caching in background (non-blocking)
            cacheEpisodesIfNeeded(anilistId, cached.details?.tmdbId, cached.details?.format).catch(() => {})

            return NextResponse.json({
                ...formatResponse(cached),
                dataSource: 'Cache (Stale)',
                isRefreshing: true
            })
        }

        // STEP 5: Cache miss - fetch fresh (blocking)
        console.log(`[API] Cache miss for "${searchTerm}" - fetching fresh data`)
        const freshData = await fetchUnifiedAnimeData(anilistId)

        // Trigger episode caching in background (non-blocking)
        cacheEpisodesIfNeeded(anilistId, freshData.details?.tmdbId, freshData.details?.format).catch(() => {})

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
