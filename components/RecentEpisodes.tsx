'use client'

import Image from 'next/image'
import { useState, useRef, useEffect, useMemo } from 'react'

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

interface RecentEpisodesProps {
    seasonName: string
    seasonNumber: number
    episodes: Episode[]
    onViewAllClick: () => void
}

export default function RecentEpisodes({ seasonName, seasonNumber, episodes, onViewAllClick }: RecentEpisodesProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [scrollProgress, setScrollProgress] = useState(0)
    const isAdjustingRef = useRef(false)
    const hasInitializedRef = useRef(false)

    if (!episodes || episodes.length === 0) {
        return null
    }

    // Create infinite loop by duplicating items (3 copies total)
    const infiniteEpisodes = useMemo(() => [...episodes, ...episodes, ...episodes], [episodes])

    const checkScrollPosition = () => {
        const container = scrollContainerRef.current
        if (!container || isAdjustingRef.current) return

        const { scrollLeft, scrollWidth, clientWidth } = container
        const sectionWidth = scrollWidth / 3

        // Calculate progress
        const middleStart = sectionWidth
        const progressWithinMiddle = ((scrollLeft - middleStart) % sectionWidth + sectionWidth) % sectionWidth
        const progress = (progressWithinMiddle / sectionWidth) * 100
        setScrollProgress(Math.max(0, Math.min(100, progress)))

        // Seamless looping
        if (scrollLeft < sectionWidth * 0.5) {
            isAdjustingRef.current = true
            container.scrollLeft = scrollLeft + sectionWidth
            setTimeout(() => { isAdjustingRef.current = false }, 50)
        } else if (scrollLeft > sectionWidth * 2.5) {
            isAdjustingRef.current = true
            container.scrollLeft = scrollLeft - sectionWidth
            setTimeout(() => { isAdjustingRef.current = false }, 50)
        }
    }

    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true
            setTimeout(() => {
                const sectionWidth = container.scrollWidth / 3
                container.scrollLeft = sectionWidth
                checkScrollPosition()
            }, 100)
        }

        container.addEventListener('scroll', checkScrollPosition, { passive: true })
        window.addEventListener('resize', checkScrollPosition)

        return () => {
            container.removeEventListener('scroll', checkScrollPosition)
            window.removeEventListener('resize', checkScrollPosition)
        }
    }, [episodes])

    const scroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current
        if (!container) return

        const scrollAmount = container.clientWidth * 0.8
        const targetScroll = direction === 'left'
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        })
    }

    return (
        <section className="w-full py-12 group">
            <div className="container mx-auto max-w-7xl px-6 md:px-16">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-mySecondary font-instrument-sans">
                        RECENT EPISODES
                    </h2>
                    <button
                        onClick={onViewAllClick}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="View all episodes"
                    >
                        {/* Grid icon matching screenshot */}
                        <svg
                            className="w-6 h-6 text-mySecondary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
                            <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
                            <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
                            <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Episodes Container with Netflix-style controls */}
                <div className="relative">
                    {/* Left Arrow */}
                    <button
                        onClick={() => scroll('left')}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full items-center justify-center bg-gradient-to-r from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        aria-label="Scroll left"
                    >
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </div>
                    </button>

                    {/* Right Arrow */}
                    <button
                        onClick={() => scroll('right')}
                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full items-center justify-center bg-gradient-to-l from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        aria-label="Scroll right"
                    >
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </div>
                    </button>

                    {/* Mobile fade overlay */}
                    <div className="md:hidden absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

                    {/* Scrollable Container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }}
                    >
                        {infiniteEpisodes.map((episode, index) => (
                            <div
                                key={`${episode.id}-${index}`}
                                className="flex-none w-[75%] md:w-[calc(33.333%-1rem)] snap-start"
                            >
                                <EpisodeCard episode={episode} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
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
        })
        : 'Date TBA'

    // Truncate description
    const truncatedDescription = episode.overview
        ? episode.overview.length > 150
            ? episode.overview.substring(0, 150) + '...'
            : episode.overview
        : 'This is the episode description and a place where a quick sentence or two will be able to give a quicker explainer what the episode was about.'

    return (
        <div className="flex-none w-80">
            {/* Episode Thumbnail */}
            <div className="relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden mb-4">
                {episode.still_url_w300 && !imageError ? (
                    <Image
                        src={episode.still_url_w300}
                        alt={episode.name}
                        fill
                        className="object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                        <svg
                            className="w-16 h-16 text-gray-400"
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
                <h3 className="text-lg font-bold text-mySecondary font-instrument-sans">
                    EPISODE {episode.episode_number}: {episode.name.toUpperCase()}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3 font-instrument-sans">
                    {truncatedDescription}
                </p>
                <p className="text-sm text-gray-500 font-instrument-sans">
                    {formattedDate}
                </p>
            </div>
        </div>
    )
}
