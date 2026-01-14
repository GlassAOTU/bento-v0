'use client'

import Image from 'next/image'
import { useState } from 'react'

interface Episode {
    id: number
    episode_number: number
    name: string
    overview: string
    air_date: string
    runtime: number
    still_url_w300: string | null
    still_url_original: string | null
}

interface Season {
    id: number
    name: string
    season_number: number
    episode_count: number
    air_date: string
    poster_url: string | null
}

interface RecentEpisodesProps {
    seasons: Season[]
    latestSeasonEpisodes: {
        season_number: number
        name: string
        episodes: Episode[]
    } | null
    onSeasonChange?: (seasonNumber: number) => Promise<Episode[]>
}

export default function RecentEpisodes({ seasons, latestSeasonEpisodes, onSeasonChange }: RecentEpisodesProps) {
    const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(
        latestSeasonEpisodes?.season_number || 1
    )
    const [episodes, setEpisodes] = useState<Episode[]>(latestSeasonEpisodes?.episodes || [])
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
    const [showAll, setShowAll] = useState(false)

    // Filter out season 0 (specials) and seasons with no episodes, sort by most recent first
    const regularSeasons = seasons
        .filter(s => s.season_number > 0 && s.episode_count > 0)
        .sort((a, b) => b.season_number - a.season_number)

    if (!regularSeasons || regularSeasons.length === 0) {
        return null
    }

    // Filter to only show aired episodes (have air_date and date is in the past)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const airedEpisodes = episodes.filter(ep => {
        if (!ep.air_date) return false
        const airDate = new Date(ep.air_date)
        return airDate <= today
    })

    const displayedEpisodes = showAll ? airedEpisodes : airedEpisodes.slice(0, 3)
    const remainingCount = airedEpisodes.length - 3

    const handleSeasonChange = async (seasonNumber: number) => {
        setSelectedSeasonNumber(seasonNumber)
        setIsDropdownOpen(false)
        setShowAll(false)

        if (onSeasonChange) {
            setIsLoadingEpisodes(true)
            try {
                const newEpisodes = await onSeasonChange(seasonNumber)
                setEpisodes(newEpisodes)
            } catch (error) {
                console.error('Failed to load episodes:', error)
            } finally {
                setIsLoadingEpisodes(false)
            }
        }
    }

    return (
        <>
            {/* Header with Season Dropdown */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-mySecondary dark:text-white font-instrument-sans">
                    Recent Episodes
                </h2>

                {/* Season Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                    >
                        <span className="text-sm font-medium">
                            {regularSeasons.find(s => s.season_number === selectedSeasonNumber)?.name || `Season ${selectedSeasonNumber}`}
                        </span>
                        <svg
                            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-darkInput border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 min-w-[140px] max-h-60 overflow-y-auto">
                                {regularSeasons.map((season) => (
                                    <button
                                        key={season.id}
                                        onClick={() => handleSeasonChange(season.season_number)}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-white ${
                                            season.season_number === selectedSeasonNumber
                                                ? 'bg-gray-50 dark:bg-gray-700 font-medium'
                                                : ''
                                        }`}
                                    >
                                        {season.name || `Season ${season.season_number}`}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Episodes Grid */}
            {isLoadingEpisodes ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : airedEpisodes.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayedEpisodes.map((episode) => (
                            <EpisodeCard key={episode.id} episode={episode} />
                        ))}
                    </div>

                    {/* Show More Button */}
                    {!showAll && remainingCount > 0 && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => setShowAll(true)}
                                className="px-6 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                            >
                                show {remainingCount} more
                            </button>
                        </div>
                    )}

                    {/* Show Less Button */}
                    {showAll && airedEpisodes.length > 3 && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => setShowAll(false)}
                                className="px-6 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                            >
                                show less
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No aired episodes yet for this season
                </div>
            )}
        </>
    )
}

function EpisodeCard({ episode }: { episode: Episode }) {
    const [imageError, setImageError] = useState(false)

    // Format date
    const formattedDate = episode.air_date
        ? new Date(episode.air_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).toUpperCase()
        : 'DATE TBA'

    // Truncate description
    const truncatedDescription = episode.overview
        ? episode.overview.length > 120
            ? episode.overview.substring(0, 120) + '...'
            : episode.overview
        : 'This is the episode description and a place where a quick sentence or two will be able to give a quicker explainer what the episode was about.'

    return (
        <div className="flex flex-col">
            {/* Episode Thumbnail */}
            <div className="relative w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
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
                            className="w-12 h-12 text-gray-400 dark:text-gray-500"
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

            {/* Episode Info */}
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-mySecondary dark:text-white font-instrument-sans uppercase">
                    EPISODE {episode.episode_number} : {episode.name.toUpperCase()}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 font-instrument-sans">
                    {truncatedDescription}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-instrument-sans uppercase">
                    {formattedDate}
                </p>
            </div>
        </div>
    )
}
