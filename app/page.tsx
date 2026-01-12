import { Metadata } from 'next'
import HomeClient from './HomeClient'
import { DEFAULT_OG_IMAGE } from '@/lib/constants'

export const metadata: Metadata = {
    title: 'Bento Anime - Personalized Anime Recommendations',
    description: 'Get personalized anime recommendations based on your mood. Discover where to watch across Netflix, Crunchyroll, Hulu & more.',
    keywords: ['anime recommendations', 'best anime 2026', 'anime to watch', 'new anime', 'where to watch anime'],
    openGraph: {
        title: 'Bento Anime - Find Your Next Favorite Anime',
        description: 'Personalized anime discovery. Tell us what you want, we find the perfect anime.',
        type: 'website',
        images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'Bento Anime' }],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@animebento',
        creator: '@animebento',
        images: [DEFAULT_OG_IMAGE],
    },
}

export default function Page() {
    return <HomeClient />
}
