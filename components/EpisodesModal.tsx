'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Episode {
    id: number
    episode_number: number
    name: string
    overview: string
    air_date: string
    runtime: number
    still_url_w300: string | null
}

interface Season {
    id: number
    name: string
    season_number: number
    episode_count: number
    air_date: string
}

interface EpisodesModalProps {
    isOpen: boolean
    onClose: () => void
    tmdbId: number
    seasons: Season[]
    currentSeasonNumber: number
}

export default function EpisodesModal({ isOpen, onClose, tmdbId, seasons, currentSeasonNumber }: EpisodesModalProps) {
    const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(currentSeasonNumber)
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [loading, setLoading] = useState(false)

    // Filter out specials (season 0)
    const regularSeasons = seasons.filter(s => s.season_number > 0)

    useEffect(() => {
        if (isOpen && selectedSeasonNumber) {
            fetchSeasonEpisodes(selectedSeasonNumber)
        }
    }, [isOpen, selectedSeasonNumber])

    async function fetchSeasonEpisodes(seasonNumber: number) {
        setLoading(true)
        try {
            // Fetch season details from TMDB
            const response = await fetch(`/api/anime/tmdb/season/${tmdbId}/${seasonNumber}`)
            if (!response.ok) throw new Error('Failed to fetch episodes')

            const data = await response.json()
            setEpisodes(data.episodes || [])
        } catch (error) {
            console.error('Error fetching season episodes:', error)
            setEpisodes([])
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-6xl bg-white dark:bg-darkBg rounded-lg shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-mySecondary dark:text-white font-instrument-sans">
                            ALL EPISODES
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <svg
                                className="w-6 h-6 text-gray-600 dark:text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Season Selector */}
                    <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-darkInput">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {regularSeasons.map((season) => (
                                <button
                                    key={season.id}
                                    onClick={() => setSelectedSeasonNumber(season.season_number)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                        selectedSeasonNumber === season.season_number
                                            ? 'bg-mySecondary text-white'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {season.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Episodes List */}
                    <div className="p-6 max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mySecondary dark:border-white" />
                            </div>
                        ) : episodes.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                No episodes available for this season.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {episodes.map((episode) => (
                                    <EpisodeItem key={episode.id} episode={episode} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function EpisodeItem({ episode }: { episode: Episode }) {
    const [imageError, setImageError] = useState(false)

    const formattedDate = episode.air_date
        ? new Date(episode.air_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : 'TBA'

    return (
        <div className="flex gap-4 p-4 bg-gray-50 dark:bg-darkInput rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-40 h-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                {episode.still_url_w300 && !imageError ? (
                    <Image
                        src={episode.still_url_w300}
                        alt={episode.name}
                        fill
                        className="object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600">
                        <svg
                            className="w-8 h-8 text-gray-400 dark:text-gray-500"
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

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-mySecondary dark:text-white mb-1 font-instrument-sans">
                    {episode.episode_number}. {episode.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {episode.overview || 'No description available.'}
                </p>
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formattedDate}</span>
                    {episode.runtime && <span>{episode.runtime} min</span>}
                </div>
            </div>
        </div>
    )
}
