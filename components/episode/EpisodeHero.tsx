'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface EpisodeHeroProps {
    animeTitle: string
    animeSlug: string
    stillUrl: string | null
    prevEpisode: { season: number; episode: number } | null
    nextEpisode: { season: number; episode: number } | null
}

export default function EpisodeHero({
    animeTitle,
    animeSlug,
    stillUrl,
    prevEpisode,
    nextEpisode
}: EpisodeHeroProps) {
    const [imageError, setImageError] = useState(false)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Link
                    href={`/anime/${animeSlug}`}
                    className="text-2xl md:text-3xl font-bold text-mySecondary dark:text-white hover:underline font-instrument-sans"
                >
                    {animeTitle}
                </Link>

                <div className="flex items-center gap-2">
                    {prevEpisode ? (
                        <Link
                            href={`/anime/${animeSlug}/${prevEpisode.season}/${prevEpisode.episode}`}
                            className="w-10 h-10 rounded-full bg-white dark:bg-darkInput border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Previous episode"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black dark:text-white">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </Link>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-50 cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-600">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </div>
                    )}

                    {nextEpisode ? (
                        <Link
                            href={`/anime/${animeSlug}/${nextEpisode.season}/${nextEpisode.episode}`}
                            className="w-10 h-10 rounded-full bg-white dark:bg-darkInput border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Next episode"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black dark:text-white">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </Link>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-50 cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-600">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                {stillUrl && !imageError ? (
                    <Image
                        src={stillUrl}
                        alt="Episode still"
                        fill
                        className="object-cover"
                        priority
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600">
                        <svg
                            className="w-16 h-16 text-gray-400 dark:text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    )
}
