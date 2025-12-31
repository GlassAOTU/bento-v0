'use client'

import { useState } from 'react'
import { DescriptionSkeleton } from '@/components/AnimePageSkeleton'

interface ExpandableDescriptionProps {
    description: string
    loading?: boolean
}

export default function ExpandableDescription({ description, loading = false }: ExpandableDescriptionProps) {
    const [expanded, setExpanded] = useState(false)

    if (loading) {
        return <DescriptionSkeleton />
    }

    const paragraphs = description.split('\n\n').filter(p => p.trim())
    const hasMultipleParagraphs = paragraphs.length > 1
    const firstParagraph = paragraphs[0] || description

    if (!hasMultipleParagraphs) {
        return (
            <p className="text-md leading-relaxed whitespace-pre-line dark:text-gray-300">
                {description}
            </p>
        )
    }

    if (expanded) {
        return (
            <div>
                <p className="text-md leading-relaxed whitespace-pre-line dark:text-gray-300">
                    {description}
                </p>
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => setExpanded(false)}
                        className="px-6 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                    >
                        Show Less
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="relative">
                <p className="text-md leading-relaxed whitespace-pre-line dark:text-gray-300">
                    {firstParagraph}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
            </div>
            <div className="flex justify-center mt-6">
                <button
                    onClick={() => setExpanded(true)}
                    className="px-6 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                >
                    Show More
                </button>
            </div>
        </div>
    )
}
