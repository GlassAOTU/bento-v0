import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import AnimePageClient from './AnimePageClient'
import { unslugify } from '@/lib/utils/slugify'
import { getAnimeDataBySlug, getOrFetchAnimeBySlug } from '@/lib/anime-server'
import { DEFAULT_OG_IMAGE } from '@/lib/constants'

function getOgImageUrl(bannerImage?: string | null, coverImage?: string | null): string {
    if (bannerImage && bannerImage.trim() !== '') return bannerImage
    if (coverImage && coverImage.trim() !== '') return coverImage
    return DEFAULT_OG_IMAGE
}

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params

    try {
        const data = await getOrFetchAnimeBySlug(slug)

        if (!data) {
            return {
                title: 'Anime Not Found | Bento Anime',
                description: 'The anime you are looking for could not be found.',
            }
        }

        const { details } = data
        const streamingPlatforms = details.streamingLinks?.map((l: any) => l.site).join(', ') || ''
        const hasStreaming = streamingPlatforms.length > 0

        const title = hasStreaming
            ? `Watch ${details.title} | Stream on ${streamingPlatforms}`
            : `${details.title} | Bento Anime`

        const description = hasStreaming
            ? `Where to watch ${details.title}. Stream on ${streamingPlatforms}. ${details.description?.slice(0, 100) || ''}...`
            : `${details.description?.slice(0, 150) || `Discover ${details.title} on Bento Anime`}...`

        return {
            title,
            description,
            keywords: [
                details.title,
                `watch ${details.title}`,
                `where to watch ${details.title}`,
                `${details.title} streaming`,
                `${details.title} anime`,
                ...(details.genres || []),
                ...(hasStreaming ? streamingPlatforms.split(', ').map((p: string) => `${details.title} ${p}`) : []),
            ],
            openGraph: {
                title: hasStreaming ? `Watch ${details.title}` : details.title,
                description: hasStreaming
                    ? `Stream ${details.title} on ${streamingPlatforms}`
                    : details.description?.slice(0, 150) || `Discover ${details.title}`,
                images: [
                    {
                        url: getOgImageUrl(details.bannerImage, details.coverImage),
                        width: 1200,
                        height: 630,
                        alt: details.title,
                    }
                ],
                type: 'video.tv_show',
                siteName: 'Bento Anime',
            },
            twitter: {
                card: 'summary_large_image',
                title: hasStreaming ? `Watch ${details.title}` : details.title,
                description: hasStreaming
                    ? `Stream ${details.title} on ${streamingPlatforms}`
                    : details.description?.slice(0, 150) || '',
                images: [getOgImageUrl(details.bannerImage, details.coverImage)],
            },
            alternates: {
                canonical: `https://bentoanime.com/anime/${slug}`,
            },
        }
    } catch (error) {
        return {
            title: 'Anime | Bento Anime',
            description: 'Discover anime on Bento Anime',
        }
    }
}

function generateJsonLd(details: any, slug: string) {
    const streamingActions = details.streamingLinks?.map((link: any) => ({
        '@type': 'WatchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: link.url,
            actionPlatform: [
                'http://schema.org/DesktopWebPlatform',
                'http://schema.org/MobileWebPlatform'
            ],
        },
        expectsAcceptanceOf: {
            '@type': 'Offer',
            availabilityStarts: details.premiered || details.aired?.split(' to ')[0],
            category: 'subscription',
        },
    })) || []

    return {
        '@context': 'https://schema.org',
        '@type': 'TVSeries',
        name: details.title,
        alternateName: details.romajiTitle,
        description: details.description,
        image: getOgImageUrl(details.bannerImage, details.coverImage),
        url: `https://bentoanime.com/anime/${slug}`,
        numberOfEpisodes: details.episodes,
        numberOfSeasons: details.seasons || 1,
        genre: details.genres,
        datePublished: details.premiered || details.aired?.split(' to ')[0],
        productionCompany: details.studios ? {
            '@type': 'Organization',
            name: details.studios,
        } : undefined,
        aggregateRating: details.rating ? {
            '@type': 'AggregateRating',
            ratingValue: (details.rating / 10).toFixed(1),
            bestRating: '10',
            worstRating: '1',
        } : undefined,
        potentialAction: streamingActions.length > 0 ? streamingActions : undefined,
    }
}

export default async function AnimePage({ params }: PageProps) {
    const { slug } = await params

    let jsonLd = null

    try {
        const data = await getAnimeDataBySlug(slug)
        if (data?.details) {
            jsonLd = generateJsonLd(data.details, slug)
        }
    } catch (error) {
        // Continue without JSON-LD if data fetch fails
    }

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <AnimePageClient slug={slug} />
        </>
    )
}
