'use client'

import { RecentSearch } from '@/lib/utils/localStorage'
import AnimeCard from './AnimeCard'
import Link from 'next/link'
import { trackRecentSearchClicked } from '@/lib/analytics/events'

interface RecentSearchCardProps {
    search: RecentSearch
    onTrailerClick?: (trailerId: string) => void
}

export default function RecentSearchCard({ search, onTrailerClick }: RecentSearchCardProps) {
    const handleSearchClick = () => {
        const daysSinceSearch = Math.floor((Date.now() - search.timestamp) / (1000 * 60 * 60 * 24))

        trackRecentSearchClicked({
            description: search.description,
            tags: search.tags,
            search_age_days: daysSinceSearch,
            results_count: search.results.length
        })
    }

    return (
        <div className="mb-16">
            {/* Search Header - Matches new recommendations page design */}
            <Link
                href={`/?description=${encodeURIComponent(search.description)}&tags=${search.tags.join(',')}`}
                className='flex flex-col gap-1 mb-4 cursor-pointer hover:opacity-80 transition-opacity'
                onClick={handleSearchClick}
            >
                {/* Query Description */}
                {search.description && search.description.length !== 0 && (
                    <p className='text-xl font-normal text-black dark:text-white'>
                        {search.description.charAt(0).toLowerCase() + search.description.slice(1)}
                    </p>
                )}

                {/* Tags or "no tags selected" */}
                {search.tags.length > 0 ? (
                    <p className='text-sm text-black dark:text-gray-300'>
                        {search.tags.join(', ')}
                    </p>
                ) : (
                    <p className='text-sm text-black dark:text-gray-300'>no tags selected</p>
                )}

                {/* Timestamp */}
                <p className='text-sm text-gray-400 dark:text-gray-500'>
                    {new Date(search.timestamp).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit'
                    }).replace(/\//g, '.')}
                </p>
            </Link>

            {/* Anime Results - Similar to AnimeSet */}
            <div className="">
                {search.results.map((result, idx) => {
                    // Convert RecentSearchResult to AnimeCard format
                    const animeItem = {
                        title: result.title,
                        reason: result.reason,
                        description: result.description,
                        image: result.image,
                        externalLinks: null,
                        trailer: null
                    }

                    return (
                        <div key={idx}>
                            <AnimeCard item={animeItem} onTrailerClick={onTrailerClick} />
                            {idx !== search.results.length - 1 && (
                                <hr className="my-5 border-t dark:border-gray-700" />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
