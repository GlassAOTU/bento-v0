'use client'

import { useState } from 'react'

interface ReviewModalProps {
    isOpen: boolean
    onClose: () => void
    anime: { id: number; title: string }
    existingReview?: { id: string; rating: number; review_text: string } | null
    onSuccess: () => void
}

export default function ReviewModal({
    isOpen,
    onClose,
    anime,
    existingReview,
    onSuccess
}: ReviewModalProps) {
    const [rating, setRating] = useState(existingReview?.rating || 0)
    const [reviewText, setReviewText] = useState(existingReview?.review_text || '')
    const [hoveredStar, setHoveredStar] = useState(0)
    const [loading, setLoading] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [error, setError] = useState('')

    const isEditing = !!existingReview

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a rating')
            return
        }
        if (reviewText.length < 10) {
            setError('Review must be at least 10 characters')
            return
        }
        if (reviewText.length > 2000) {
            setError('Review must be under 2000 characters')
            return
        }

        setLoading(true)
        setError('')

        try {
            const url = isEditing ? `/api/reviews/${existingReview.id}` : '/api/reviews'
            const method = isEditing ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    anime_id: anime.id,
                    rating,
                    review_text: reviewText
                })
            })

            if (!response.ok) {
                const data = await response.json()
                if (response.status === 409) {
                    setError('You have already reviewed this anime')
                } else {
                    setError(data.error || 'Failed to submit review')
                }
                return
            }

            onSuccess()
            onClose()
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!existingReview) return

        setDeleteLoading(true)
        setError('')

        try {
            const response = await fetch(`/api/reviews/${existingReview.id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json()
                setError(data.error || 'Failed to delete review')
                return
            }

            onSuccess()
            onClose()
        } catch {
            setError('Something went wrong')
        } finally {
            setDeleteLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="relative bg-white p-6 rounded-lg w-full max-w-lg mx-4">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>

                <h2 className="text-xl font-bold mb-1">
                    {isEditing ? 'Edit Review' : 'Write a Review'}
                </h2>
                <p className="text-gray-500 text-sm mb-6">{anime.title}</p>

                {/* Star Rating */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Rating</label>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredStar(star)}
                                onMouseLeave={() => setHoveredStar(0)}
                                className="p-1 transition-transform hover:scale-110"
                            >
                                <svg
                                    className={`w-8 h-8 ${
                                        star <= (hoveredStar || rating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'fill-gray-200 text-gray-200'
                                    } transition-colors`}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Review Text */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Your Review</label>
                    <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your thoughts about this anime..."
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-black/10"
                        maxLength={2000}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{reviewText.length < 10 ? `${10 - reviewText.length} more characters needed` : ''}</span>
                        <span>{reviewText.length}/2000</span>
                    </div>
                </div>

                {error && (
                    <p className="text-red-500 text-sm mb-4">{error}</p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {isEditing && (
                        <button
                            onClick={handleDelete}
                            disabled={deleteLoading || loading}
                            className="px-4 py-2 text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete'}
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || deleteLoading}
                        className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : isEditing ? 'Update Review' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    )
}
