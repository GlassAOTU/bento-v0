'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Video {
    id: string
    key: string
    name: string
    type: string
    site: string
    official: boolean
    published_at: string
}

interface VideosSectionProps {
    videos: Video[]
    onVideoClick: (videoKey: string) => void
}

export default function VideosSection({ videos, onVideoClick }: VideosSectionProps) {
    const [showAll, setShowAll] = useState(false)

    if (!videos || videos.length === 0) {
        return null
    }

    // Sort videos: Official trailers first, then by type, then by date
    const sortedVideos = [...videos].sort((a, b) => {
        // Official content first
        if (a.official && !b.official) return -1
        if (!a.official && b.official) return 1

        // Trailers before other types
        const typeOrder = ['Trailer', 'Teaser', 'Clip', 'Featurette', 'Behind the Scenes', 'Opening Credits', 'Promo']
        const aTypeIndex = typeOrder.indexOf(a.type)
        const bTypeIndex = typeOrder.indexOf(b.type)
        if (aTypeIndex !== bTypeIndex) {
            return (aTypeIndex === -1 ? 999 : aTypeIndex) - (bTypeIndex === -1 ? 999 : bTypeIndex)
        }

        // Newest first
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    })

    const displayedVideos = showAll ? sortedVideos : sortedVideos.slice(0, 2)
    const remainingCount = sortedVideos.length - 2

    return (
        <section className="w-full py-12">
            <div className="container mx-auto max-w-7xl px-6 md:px-16">
                {/* Header */}
                <h2 className="text-2xl font-bold text-mySecondary font-instrument-sans mb-8">
                    Videos
                </h2>

                {/* Videos Grid - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displayedVideos.map((video) => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            onClick={() => onVideoClick(video.key)}
                        />
                    ))}
                </div>

                {/* Show More Button */}
                {!showAll && remainingCount > 0 && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => setShowAll(true)}
                            className="px-6 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            show {remainingCount} more
                        </button>
                    </div>
                )}

                {/* Show Less Button */}
                {showAll && sortedVideos.length > 2 && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => setShowAll(false)}
                            className="px-6 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            show less
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}

function VideoCard({ video, onClick }: { video: Video; onClick: () => void }) {
    const [imageError, setImageError] = useState(false)

    // YouTube thumbnail URL
    const thumbnailUrl = video.site === 'YouTube'
        ? `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`
        : null

    // Format video type for display
    const formatType = (type: string) => {
        return type.toUpperCase()
    }

    return (
        <button
            onClick={onClick}
            className="flex flex-col text-left group cursor-pointer"
        >
            {/* Video Thumbnail */}
            <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
                {thumbnailUrl && !imageError ? (
                    <>
                        <Image
                            src={thumbnailUrl}
                            alt={video.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={() => setImageError(true)}
                        />
                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg
                                    className="w-6 h-6 text-black ml-1"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                        <svg
                            className="w-12 h-12 text-gray-400"
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

            {/* Video Info */}
            <h3 className="text-sm font-bold text-mySecondary font-instrument-sans uppercase">
                {formatType(video.type)}
            </h3>
        </button>
    )
}
