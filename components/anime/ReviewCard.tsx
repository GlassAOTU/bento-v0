'use client'

import Image from 'next/image'
import Link from 'next/link'

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
}

export default function ReviewCard({ review, isOwn, onEdit }: ReviewCardProps) {
    const renderStars = (rating: number) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`w-4 h-4 ${
                        star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
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
        <div className={`p-4 rounded-lg border ${isOwn ? 'border-black/20 bg-gray-50' : 'border-gray-200'}`}>
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
                                className="font-medium hover:underline truncate"
                            >
                                {review.display_name || review.username}
                            </Link>
                            {isOwn && (
                                <span className="text-xs bg-black text-white px-2 py-0.5 rounded">You</span>
                            )}
                        </div>
                        {isOwn && onEdit && (
                            <button
                                onClick={onEdit}
                                className="text-sm text-gray-500 hover:text-black transition-colors"
                            >
                                Edit
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                    </div>

                    <p className="mt-2 text-gray-700 text-sm whitespace-pre-wrap">
                        {review.review_text}
                    </p>
                </div>
            </div>
        </div>
    )
}
