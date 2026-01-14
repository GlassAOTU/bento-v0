'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import SharePreviewModal from './SharePreviewModal'
import { slugify } from '@/lib/utils/slugify'
import { trackReviewSharePreviewOpened } from '@/lib/analytics/events'

interface ReviewCardProps {
    review: {
        id: string
        username: string
        display_name: string | null
        avatar_url: string | null
        rating: number
        review_text: string
        created_at: string
    }
    isOwn: boolean
    onEdit?: () => void
    anime?: {
        id: number
        title: string
        bannerImage: string
    }
}

export default function ReviewCard({ review, isOwn, onEdit, anime }: ReviewCardProps) {
    const [showShareModal, setShowShareModal] = useState(false)

    const handleShareClick = () => {
        if (anime) {
            trackReviewSharePreviewOpened({
                anime_title: anime.title,
                anime_id: anime.id
            })
            setShowShareModal(true)
        }
    }
    const renderStars = (rating: number) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`w-4 h-4 ${
                        star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 dark:fill-gray-600 text-gray-200 dark:text-gray-600'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
            ))}
        </div>
    )

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div className={`p-4 rounded-lg border ${isOwn ? 'border-black/20 dark:border-white/20 bg-gray-50 dark:bg-darkInput' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <Link href={`/${review.username}`} className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        {review.avatar_url ? (
                            <Image
                                src={review.avatar_url}
                                alt={review.username}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white text-sm font-bold">
                                {review.username.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                </Link>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link
                                href={`/${review.username}`}
                                className="font-medium hover:underline truncate dark:text-white"
                            >
                                {review.display_name || review.username}
                            </Link>
                            {isOwn && (
                                <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded">You</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isOwn && anime && (
                                <button
                                    onClick={handleShareClick}
                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                    title="Share on X"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </button>
                            )}
                            {isOwn && onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(review.created_at)}</span>
                    </div>

                    <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                        {review.review_text}
                    </p>
                </div>
            </div>

            {anime && (
                <SharePreviewModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    animeId={anime.id}
                    animeTitle={anime.title}
                    animeSlug={slugify(anime.title)}
                    bannerUrl={anime.bannerImage}
                    username={review.username}
                    displayName={review.display_name}
                    rating={review.rating}
                    reviewText={review.review_text}
                />
            )}
        </div>
    )
}
