'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import CommentCard from './CommentCard'
import CommentForm from './CommentForm'

interface Comment {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    comment_text: string
    created_at: string
}

interface EpisodeCommentsProps {
    episodeId: string
}

export default function EpisodeComments({ episodeId }: EpisodeCommentsProps) {
    const { user, profile } = useAuth()
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch(
                `/api/episode-comments/episode/${episodeId}?sort=${sortOrder}&limit=50`
            )
            if (response.ok) {
                const data = await response.json()
                setComments(data.comments || [])
            }
        } catch (error) {
            console.error('Error fetching comments:', error)
        } finally {
            setLoading(false)
        }
    }, [episodeId, sortOrder])

    useEffect(() => {
        fetchComments()
    }, [fetchComments])

    const handleSortChange = (order: 'newest' | 'oldest') => {
        setSortOrder(order)
        setIsDropdownOpen(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-mySecondary dark:text-white font-instrument-sans">
                    Comments
                </h2>

                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                    >
                        <span>Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
                        <svg
                            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-darkInput border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 min-w-[100px]">
                                <button
                                    onClick={() => handleSortChange('newest')}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-white ${
                                        sortOrder === 'newest' ? 'font-medium bg-gray-50 dark:bg-gray-700' : ''
                                    }`}
                                >
                                    Newest
                                </button>
                                <button
                                    onClick={() => handleSortChange('oldest')}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-white ${
                                        sortOrder === 'oldest' ? 'font-medium bg-gray-50 dark:bg-gray-700' : ''
                                    }`}
                                >
                                    Oldest
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : comments.length > 0 ? (
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <CommentCard
                            key={comment.id}
                            comment={comment}
                            isOwn={profile?.username === comment.username}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No comments yet. Be the first to comment!
                </div>
            )}

            <CommentForm episodeId={episodeId} onCommentAdded={fetchComments} />
        </div>
    )
}
