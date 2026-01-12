import { Metadata } from 'next'
import AnimePageClient from './AnimePageClient'
import { slugify } from '@/lib/utils/slugify'
import { getOrFetchAnimeBySlug, getAllCachedAnime } from '@/lib/anime-server'
import { DEFAULT_OG_IMAGE } from '@/lib/constants'

function getOgImageUrl(bannerImage?: string | null, coverImage?: string | null): string {
    if (bannerImage && bannerImage.trim() !== '') return bannerImage
    if (coverImage && coverImage.trim() !== '') return coverImage
    return DEFAULT_OG_IMAGE
}

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
    const anime = await getAllCachedAnime()
    return anime.map((a) => ({ slug: slugify(a.title) }))
}

export const dynamicParams = true
export const revalidate = 86400

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
                site: '@animebento',
                creator: '@animebento',
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
    const trailer = details.videos?.find((v: any) => v.type === 'Trailer' && v.official)
        || details.videos?.[0]
        || (details.trailer?.id ? { key: details.trailer.id } : null)

    const streamingPlatforms = details.streamingLinks?.map((l: any) => l.site).join(', ')

    const tvSeries = {
        '@context': 'https://schema.org',
        '@type': 'TVSeries',
        name: details.title,
        alternateName: details.romajiTitle,
        description: details.description,
        image: getOgImageUrl(details.bannerImage, details.coverImage),
        url: `https://bentoanime.com/anime/${slug}`,
        numberOfEpisodes: details.episodes,
        numberOfSeasons: details.seasons?.length || 1,
        genre: details.genres,
        datePublished: details.premiered,
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
        trailer: trailer ? {
            '@type': 'VideoObject',
            name: `${details.title} Official Trailer`,
            description: `Watch the official trailer for ${details.title}`,
            thumbnailUrl: getOgImageUrl(details.bannerImage, details.coverImage),
            uploadDate: trailer.published_at || details.premiered,
            embedUrl: `https://www.youtube.com/embed/${trailer.key}`,
            contentUrl: `https://www.youtube.com/watch?v=${trailer.key}`,
        } : undefined,
        potentialAction: details.streamingLinks?.map((link: any) => ({
            '@type': 'WatchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: link.url,
            },
        })),
    }

    const breadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bentoanime.com' },
            { '@type': 'ListItem', position: 2, name: 'Discover', item: 'https://bentoanime.com/discover' },
            { '@type': 'ListItem', position: 3, name: details.title, item: `https://bentoanime.com/anime/${slug}` },
        ],
    }

    const faqItems = [
        streamingPlatforms && {
            '@type': 'Question',
            name: `Where can I watch ${details.title}?`,
            acceptedAnswer: {
                '@type': 'Answer',
                text: `You can stream ${details.title} on ${streamingPlatforms}.`,
            },
        },
        details.episodes && {
            '@type': 'Question',
            name: `How many episodes does ${details.title} have?`,
            acceptedAnswer: {
                '@type': 'Answer',
                text: `${details.title} has ${details.episodes} episodes.`,
            },
        },
        details.genres?.length > 0 && {
            '@type': 'Question',
            name: `What genre is ${details.title}?`,
            acceptedAnswer: {
                '@type': 'Answer',
                text: `${details.title} is a ${details.genres.join(', ')} anime.`,
            },
        },
    ].filter(Boolean)

    const faq = faqItems.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems,
    } : null

    return [tvSeries, breadcrumbs, faq].filter(Boolean)
}

export default async function AnimePage({ params }: PageProps) {
    const { slug } = await params

    let jsonLdSchemas: any[] = []

    try {
        const data = await getOrFetchAnimeBySlug(slug)
        if (data?.details) {
            jsonLdSchemas = generateJsonLd(data.details, slug)
        }
    } catch (error) {
        // Continue without JSON-LD if data fetch fails
    }

    return (
        <>
            {jsonLdSchemas.map((schema, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ))}
            <AnimePageClient slug={slug} />
        </>
    )
}
