import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import SharedRecommendationView from '@/components/SharedRecommendationView'

type PageProps = {
    params: Promise<{ shortcode: string }>
}

async function getShareData(shortcode: string) {
    const supabase = await createClient()

    const { data: share, error } = await supabase
        .from('shared_recommendations')
        .select('*')
        .eq('shortcode', shortcode.toLowerCase())
        .single()

    if (error || !share) return null

    return {
        shortcode: share.shortcode,
        recommendations: share.recommendations,
        prompt: share.prompt,
        promptTruncated: share.prompt_truncated,
        tags: share.tags,
        viewCount: share.view_count,
        createdAt: share.created_at,
        coverImageUrl: share.cover_image_url
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { shortcode } = await params
    const data = await getShareData(shortcode)

    if (!data) {
        return {
            title: 'Share Not Found - Bento Anime'
        }
    }

    const count = data.recommendations?.length || 0
    const title = data.prompt
        ? `${data.prompt} - Bento Anime Recommendations`
        : `${count} Anime Recommendations - Bento Anime`

    const description = data.tags?.length > 0
        ? `Check out these anime recommendations: ${data.tags.slice(0, 3).join(', ')}`
        : `Discover ${count} curated anime recommendations`

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            url: `https://bentoanime.com/r/${shortcode}`,
            images: [
                {
                    url: data.coverImageUrl || 'https://bentoanime.com/images/Updated%20Link%20Preview%20Thumbnail.png',
                    width: 1200,
                    height: 630,
                    alt: 'Bento Anime Recommendations'
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description
        }
    }
}

export default async function SharedRecommendationPage({ params }: PageProps) {
    const { shortcode } = await params
    const data = await getShareData(shortcode)

    if (!data) {
        notFound()
    }

    return (
        <SharedRecommendationView
            shortcode={shortcode}
            recommendations={data.recommendations}
            prompt={data.prompt}
            promptTruncated={data.promptTruncated}
            tags={data.tags}
            viewCount={data.viewCount}
            createdAt={data.createdAt}
        />
    )
}
