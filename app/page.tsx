import { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
    title: 'Bento Anime - Personalized Anime Recommendations',
    description: 'Get personalized anime recommendations based on your mood. Discover where to watch across Netflix, Crunchyroll, Hulu & more.',
    keywords: ['anime recommendations', 'best anime 2026', 'anime to watch', 'new anime', 'where to watch anime'],
    openGraph: {
        title: 'Bento Anime - Find Your Next Favorite Anime',
        description: 'Personalized anime discovery. Tell us what you want, we find the perfect anime.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@animebento',
        creator: '@animebento',
    },
}

export default function Page() {
    return <HomeClient />
}
