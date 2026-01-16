'use client'

import { useRouter } from 'next/navigation'
import NavigationBar from '@/components/NavigationBar'
import Footer from '@/components/Footer'
import EpisodeHero from '@/components/episode/EpisodeHero'
import EpisodeInfo from '@/components/episode/EpisodeInfo'
import EpisodeComments from '@/components/episode/EpisodeComments'
import AnimeSection from '@/components/anime/AnimeSection'
import { Episode } from '@/lib/supabase/episode-data'

interface EpisodePageClientProps {
    animeSlug: string
    animeTitle: string
    animeId: number
    episode: Episode | null
    seasonNumber: number
    episodeNumber: number
    prevEpisode: { season: number; episode: number } | null
    nextEpisode: { season: number; episode: number } | null
    streamingLinks: { url: string; site: string }[]
}

export default function EpisodePageClient({
    animeSlug,
    animeTitle,
    animeId,
    episode,
    seasonNumber,
    episodeNumber,
    prevEpisode,
    nextEpisode,
    streamingLinks
}: EpisodePageClientProps) {
    const router = useRouter()

    if (!episode) {
        return (
            <div className="bg-white dark:bg-darkBg min-h-screen">
                <NavigationBar />
                <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Episode Not Found</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        This episode hasn&apos;t been cached yet. Try visiting the anime page first.
                    </p>
                    <button
                        onClick={() => router.push(`/anime/${animeSlug}`)}
                        className="px-6 py-3 bg-mySecondary text-white rounded-md hover:bg-[#2b2b2b] transition-colors"
                    >
                        Go to Anime Page
                    </button>
                </div>
                <Footer />
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-darkBg min-h-screen">
            <NavigationBar />

            <div className="container mx-auto max-w-4xl px-6 md:px-8 py-8">
                <button
                    onClick={() => router.push(`/anime/${animeSlug}`)}
                    className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                </button>

                <div className="space-y-8">
                    <EpisodeHero
                        animeTitle={animeTitle}
                        animeSlug={animeSlug}
                        stillUrl={episode.still_url}
                        prevEpisode={prevEpisode}
                        nextEpisode={nextEpisode}
                    />

                    <EpisodeInfo
                        seasonNumber={seasonNumber}
                        episodeNumber={episodeNumber}
                        name={episode.name}
                        overview={episode.overview}
                        airDate={episode.air_date}
                        runtime={episode.runtime}
                        streamingLinks={streamingLinks}
                    />

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                        <EpisodeComments episodeId={episode.id} />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}
