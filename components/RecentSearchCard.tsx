'use client'

import { RecentSearch, formatSearchTimestamp } from '@/lib/utils/localStorage'
import AnimeCard from './AnimeCard'

interface RecentSearchCardProps {
    search: RecentSearch
    onTrailerClick?: (trailerId: string) => void
}

export default function RecentSearchCard({ search, onTrailerClick }: RecentSearchCardProps) {
    return (
        <div className="mb-16">
            {/* Search Header - Similar to recommendation page */}
            <div className='bg-[#f8f8f8] flex justify-center p-4 mb-8'>
                <div className='flex flex-col gap-1 items-center'>
                    <span className='text-center font-bold text-black'>
                        {formatSearchTimestamp(search.timestamp)}
                    </span>
                    {search.description && search.description.length !== 0 && (
                        <span className='text-black'>{search.description.charAt(0).toUpperCase() + search.description.slice(1)}</span>
                    )}
                    {search.tags.length !== 0 && (
                        <div className='flex flex-row gap-2'>
                            {search.tags.map((tag, i) =>
                                <div key={i} className='px-2 border text-sm border-black text-black bg-white border-opacity-25'>
                                    {tag}
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
