'use client'

import { RecentSearch } from '@/lib/utils/localStorage'
import AnimeCard from './AnimeCard'

interface RecentSearchCardProps {
    search: RecentSearch
    onTrailerClick?: (trailerId: string) => void
}

export default function RecentSearchCard({ search, onTrailerClick }: RecentSearchCardProps) {
    return (
        <div className="mb-16">
            {/* Search Header - Matches new recommendations page design */}
            <div className='flex flex-col gap-1 mb-4'>
                {/* Query Description */}
                {search.description && search.description.length !== 0 && (
                    <p className='text-xl font-normal text-black'>
                        {search.description.charAt(0).toLowerCase() + search.description.slice(1)}
                    </p>
                )}

                {/* Tags or "no tags selected" */}
                {search.tags.length > 0 ? (
                    <p className='text-sm text-black'>
                        {search.tags.join(', ')}
                    </p>
                ) : (
                    <p className='text-sm text-black'>no tags selected</p>
                )}

                {/* Timestamp */}
                <p className='text-sm text-gray-400'>
                    {new Date(search.timestamp).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit'
                    }).replace(/\//g, '.')}
                </p>
            </div>

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
                                <hr className="my-5 border-t" />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
