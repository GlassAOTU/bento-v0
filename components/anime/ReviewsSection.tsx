'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import ReviewCard from './ReviewCard'
import ReviewModal from './ReviewModal'

interface Review {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    rating: number
    review_text: string
    created_at: string
}

interface ReviewsSectionProps {
    animeId: number
    animeTitle: string
    animeImage: string
}

export default function ReviewsSection({ animeId, animeTitle, animeImage }: ReviewsSectionProps) {
    const { user, profile } = useAuth()
    const [reviews, setReviews] = useState<Review[]>([])
    const [userReview, setUserReview] = useState<Review | null>(null)
    const [loading, setLoading] = useState(true)
    const [showAll, setShowAll] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const fetchReviews = async () => {
        try {
            setLoading(true)

            const [reviewsRes, mineRes] = await Promise.all([
                fetch(`/api/reviews/anime/${animeId}`),
                user ? fetch(`/api/reviews/anime/${animeId}/mine`) : Promise.resolve(null)
            ])

            const reviewsData = await reviewsRes.json()
            const allReviews: Review[] = reviewsData.reviews || []

            if (mineRes) {
                const mineData = await mineRes.json()
                if (mineData.review) {
                    setUserReview(mineData.review)
                    const othersReviews = allReviews.filter(r => r.id !== mineData.review.id)
                    setReviews(othersReviews)
                } else {
                    setUserReview(null)
                    setReviews(allReviews)
                }
            } else {
                setReviews(allReviews)
            }
        } catch (err) {
            console.error('Failed to fetch reviews:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReviews()
    }, [animeId, user])

    const handleModalSuccess = () => {
        fetchReviews()
    }

    const visibleReviews = showAll ? reviews : reviews.slice(0, 5)
    const hasMoreReviews = reviews.length > 5
    const totalCount = reviews.length + (userReview ? 1 : 0)

    if (loading) {
        return (
            <div>
                <h2 className="text-2xl font-bold mb-6">Reviews</h2>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                                        <div className="h-3 bg-gray-200 rounded w-32 mb-2" />
                                        <div className="h-3 bg-gray-200 rounded w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                    Reviews {totalCount > 0 && <span className="text-gray-400 font-normal">({totalCount})</span>}
                </h2>
                {user && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        {userReview ? 'Edit Your Review' : 'Write a Review'}
                    </button>
                )}
            </div>

            {totalCount === 0 ? (
                <div className="text-center py-12 border border-gray-200 rounded-lg">
                    <p className="text-gray-500 mb-4">No reviews yet. Be the first to share your thoughts!</p>
                    {user ? (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                        >
                            Write a Review
                        </button>
                    ) : (
                        <p className="text-sm text-gray-400">Sign in to write a review</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* User's review at top */}
                    {userReview && profile && (
                        <ReviewCard
                            review={{
                                ...userReview,
                                username: profile.username,
                                display_name: profile.display_name,
                                avatar_url: profile.avatar_url
                            }}
                            isOwn={true}
                            onEdit={() => setIsModalOpen(true)}
                        />
                    )}

                    {/* Other reviews */}
                    {visibleReviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            isOwn={false}
                        />
                    ))}

                    {/* Show more button */}
                    {hasMoreReviews && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="w-full py-3 text-sm font-medium text-gray-600 hover:text-black border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                            Show {reviews.length - 5} more reviews
                        </button>
                    )}
                </div>
            )}

            {/* Review Modal */}
            <ReviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                anime={{ id: animeId, title: animeTitle, image: animeImage }}
                existingReview={userReview ? {
                    id: userReview.id,
                    rating: userReview.rating,
                    review_text: userReview.review_text
                } : null}
                onSuccess={handleModalSuccess}
            />
        </div>
    )
}
