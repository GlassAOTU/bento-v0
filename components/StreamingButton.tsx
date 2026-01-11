'use client'

import { PlatformIcon } from './PlatformIcon'
import { Tooltip } from './Tooltip'

interface StreamingButtonProps {
    platform: string
    url: string
    onTrack?: () => void
}

export function StreamingButton({ platform, url, onTrack }: StreamingButtonProps) {
    return (
        <Tooltip content={`Watch on ${platform}`}>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onTrack}
                aria-label={`Watch on ${platform}`}
                className="px-4 py-2.5 bg-white/90 hover:bg-white dark:bg-darkInput/90 dark:hover:bg-gray-800 rounded-md transition-colors border border-gray-200 dark:border-white/40 shadow-sm inline-flex items-center justify-center"
            >
                <PlatformIcon
                    platform={platform}
                    size={24}
                    className="text-black dark:text-white"
                />
            </a>
        </Tooltip>
    )
}
