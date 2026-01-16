import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EpisodePageClient from './EpisodePageClient'
import { getAnimeBySlug } from '@/lib/supabase/anime-data'
import { getEpisode, getEpisodesByAnimeId, getAllCachedEpisodes } from '@/lib/supabase/episode-data'
import { DEFAULT_OG_IMAGE } from '@/lib/constants'

interface PageProps {
    params: Promise<{ slug: string; season: string; episode: string }>
}

export async function generateStaticParams() {
    const episodes = await getAllCachedEpisodes()
    return episodes.map((ep) => ({
        slug: ep.slug,
        season: String(ep.season_number),
        episode: String(ep.episode_number)
    }))
}

export const dynamicParams = true
export const revalidate = 86400

function generateJsonLd(
    animeTitle: string,
    animeSlug: string,
    seasonNum: number,
    episodeNum: number,
    episodeName: string | null,
    overview: string | null,
    stillUrl: string | null,
    airDate: string | null,
    runtime: number | null,
    streamingLinks: { url: string; site: string }[]
) {
    const canonicalUrl = `https://bentoanime.com/anime/${animeSlug}/${seasonNum}/${episodeNum}`
    const animePageUrl = `https://bentoanime.com/anime/${animeSlug}`
    const displayName = episodeName || `Episode ${episodeNum}`

    const tvEpisode: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'TVEpisode',
        name: displayName,
        episodeNumber: episodeNum,
        partOfSeries: {
            '@type': 'TVSeries',
            name: animeTitle,
            url: animePageUrl
        },
        partOfSeason: {
            '@type': 'TVSeason',
            seasonNumber: seasonNum
        },
        url: canonicalUrl
    }

    if (overview) tvEpisode.description = overview
    if (stillUrl) tvEpisode.image = stillUrl
    if (airDate) tvEpisode.datePublished = airDate
    if (runtime) tvEpisode.duration = `PT${runtime}M`

    if (streamingLinks.length > 0) {
        tvEpisode.potentialAction = streamingLinks.map((link) => ({
            '@type': 'WatchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: link.url
            }
        }))
    }

    const breadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bentoanime.com' },
            { '@type': 'ListItem', position: 2, name: 'Discover', item: 'https://bentoanime.com/discover' },
            { '@type': 'ListItem', position: 3, name: animeTitle, item: animePageUrl },
            { '@type': 'ListItem', position: 4, name: `Season ${seasonNum}`, item: `${animePageUrl}#season-${seasonNum}` },
            { '@type': 'ListItem', position: 5, name: `Episode ${episodeNum}`, item: canonicalUrl }
        ]
    }

    return [tvEpisode, breadcrumbs]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, season, episode } = await params
    const seasonNum = parseInt(season, 10)
    const episodeNum = parseInt(episode, 10)

    try {
        const animeData = await getAnimeBySlug(slug)
        if (!animeData) {
            return {
                title: 'Episode Not Found | Bento Anime',
                description: 'The episode you are looking for could not be found.',
            }
        }

        const episodeData = await getEpisode(animeData.anime_id, seasonNum, episodeNum)
        const animeTitle = animeData.details?.title || slug
        const episodeName = episodeData?.name || null
        const streamingLinks = animeData.details?.streamingLinks || []
        const streamingPlatforms = streamingLinks.map((l: any) => l.site).join(', ')

        const title = episodeName
            ? `Watch ${animeTitle} Season ${seasonNum} Episode ${episodeNum} - ${episodeName} | Bento Anime`
            : `Watch ${animeTitle} Season ${seasonNum} Episode ${episodeNum} | Bento Anime`

        let description = `Watch ${animeTitle} Season ${seasonNum} Episode ${episodeNum}`
        if (episodeName) description += ` "${episodeName}"`
        description += ' online.'
        if (episodeData?.overview) {
            description += ` ${episodeData.overview.slice(0, 100)}...`
        }
        if (streamingPlatforms) {
            description += ` Stream on ${streamingPlatforms}.`
        }

        const ogImage = episodeData?.still_url || animeData.details?.bannerImage || DEFAULT_OG_IMAGE
        const ogTitle = episodeName
            ? `${animeTitle} S${seasonNum}E${episodeNum}: ${episodeName}`
            : `${animeTitle} Season ${seasonNum} Episode ${episodeNum}`

        const keywords = [
            animeTitle,
            `${animeTitle} season ${seasonNum}`,
            `${animeTitle} episode ${episodeNum}`,
            `${animeTitle} S${seasonNum}E${episodeNum}`,
            `watch ${animeTitle} season ${seasonNum} episode ${episodeNum}`,
            `${animeTitle} season ${seasonNum} episode ${episodeNum}`,
            ...(episodeName ? [`${animeTitle} ${episodeName}`] : []),
            'anime episode',
            'watch anime online',
            'anime streaming',
            ...(streamingPlatforms ? streamingPlatforms.split(', ').map((p: string) => `${animeTitle} ${p}`) : [])
        ]

        return {
            title,
            description,
            keywords,
            openGraph: {
                title: ogTitle,
                description,
                images: [{
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: `${animeTitle} Season ${seasonNum} Episode ${episodeNum}${episodeName ? ` - ${episodeName}` : ''}`
                }],
                type: 'video.episode',
                siteName: 'Bento Anime',
            },
            twitter: {
                card: 'summary_large_image',
                site: '@animebento',
                creator: '@animebento',
                title: ogTitle,
                description,
                images: [ogImage],
            },
            alternates: {
                canonical: `https://bentoanime.com/anime/${slug}/${season}/${episode}`,
            },
        }
    } catch (error) {
        return {
            title: 'Episode | Bento Anime',
            description: 'Watch episodes on Bento Anime',
        }
    }
}

export default async function EpisodePage({ params }: PageProps) {
    const { slug, season, episode } = await params
    const seasonNum = parseInt(season, 10)
    const episodeNum = parseInt(episode, 10)

    if (isNaN(seasonNum) || isNaN(episodeNum)) {
        notFound()
    }

    const animeData = await getAnimeBySlug(slug)
    if (!animeData) {
        notFound()
    }

    if (animeData.details?.format === 'MOVIE') {
        notFound()
    }

    const episodeData = await getEpisode(animeData.anime_id, seasonNum, episodeNum)
    const allEpisodes = await getEpisodesByAnimeId(animeData.anime_id)
    const streamingLinks = animeData.details?.streamingLinks || []
    const animeTitle = animeData.details?.title || slug

    const currentIndex = allEpisodes.findIndex(
        (ep) => ep.season_number === seasonNum && ep.episode_number === episodeNum
    )

    const prevEpisode = currentIndex > 0 ? {
        season: allEpisodes[currentIndex - 1].season_number,
        episode: allEpisodes[currentIndex - 1].episode_number
    } : null

    const nextEpisode = currentIndex < allEpisodes.length - 1 ? {
        season: allEpisodes[currentIndex + 1].season_number,
        episode: allEpisodes[currentIndex + 1].episode_number
    } : null

    const jsonLdSchemas = generateJsonLd(
        animeTitle,
        slug,
        seasonNum,
        episodeNum,
        episodeData?.name || null,
        episodeData?.overview || null,
        episodeData?.still_url || null,
        episodeData?.air_date || null,
        episodeData?.runtime || null,
        streamingLinks
    )

    return (
        <>
            {jsonLdSchemas.map((schema, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ))}
            <EpisodePageClient
                animeSlug={slug}
                animeTitle={animeTitle}
                animeId={animeData.anime_id}
                episode={episodeData}
                seasonNumber={seasonNum}
                episodeNumber={episodeNum}
                prevEpisode={prevEpisode}
                nextEpisode={nextEpisode}
                streamingLinks={streamingLinks}
            />
        </>
    )
}
