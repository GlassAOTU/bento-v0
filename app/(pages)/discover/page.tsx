import { Metadata } from 'next'
import DiscoverClient from './DiscoverClient'

export const metadata: Metadata = {
    title: 'Discover Anime - Browse by Genre & Category | Bento Anime',
    description: 'Explore anime by genre: Shonen, Isekai, Slice of Life, Romance. Find top rated, most popular, and hidden gem anime.',
    keywords: ['discover anime', 'anime genres', 'shonen anime', 'isekai anime', 'slice of life', 'romance anime', 'anime list', 'best anime', 'anime movies'],
    openGraph: {
        title: 'Discover Anime - Browse by Genre | Bento Anime',
        description: 'Explore anime by genre and find your next favorite series.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@animebento',
    },
}

export default function DiscoverPage() {
    return <DiscoverClient />
}
