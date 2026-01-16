'use client'

import { StreamingButton } from '@/components/StreamingButton'

interface EpisodeInfoProps {
    seasonNumber: number
    episodeNumber: number
    name: string | null
    overview: string | null
    airDate: string | null
    runtime: number | null
    streamingLinks?: { url: string; site: string }[]
}

export default function EpisodeInfo({
    seasonNumber,
    episodeNumber,
    name,
    overview,
    airDate,
    runtime,
    streamingLinks
}: EpisodeInfoProps) {
    const formattedDate = airDate
        ? new Date(airDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
        : null

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-mySecondary dark:text-white font-instrument-sans">
                    S{seasonNumber}E{episodeNumber}: {name || 'Episode ' + episodeNumber}
                </h1>
                {formattedDate && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Aired: {formattedDate}
                        {runtime && ` · ${runtime} min`}
                    </p>
                )}
            </div>

            {overview && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {overview}
                </p>
            )}

            {streamingLinks && streamingLinks.length > 0 && (
                <div className="pt-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Watch it on
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {streamingLinks.map((link, index) => (
                            <StreamingButton
                                key={index}
                                platform={link.site}
                                url={link.url}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
