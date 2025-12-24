import { MetadataRoute } from 'next'
import { getAllCachedAnime, getAllPublicProfiles, getAllPublicWatchlists } from '@/lib/anime-server'
import { slugify } from '@/lib/utils/slugify'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://bentoanime.com'

    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/discover`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ]

    const [animeList, profiles, watchlists] = await Promise.all([
        getAllCachedAnime(),
        getAllPublicProfiles(),
        getAllPublicWatchlists(),
    ])

    const animePages: MetadataRoute.Sitemap = animeList.map((anime) => ({
        url: `${baseUrl}/anime/${slugify(anime.title)}`,
        lastModified: new Date(anime.last_fetched),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    const profilePages: MetadataRoute.Sitemap = profiles.map((profile) => ({
        url: `${baseUrl}/${profile.username}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }))

    const watchlistPages: MetadataRoute.Sitemap = watchlists.map((watchlist) => ({
        url: `${baseUrl}/${watchlist.username}/${watchlist.slug}`,
        lastModified: new Date(watchlist.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }))

    return [...staticPages, ...animePages, ...profilePages, ...watchlistPages]
}
