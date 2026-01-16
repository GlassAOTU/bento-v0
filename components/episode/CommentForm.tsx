'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'

interface CommentFormProps {
    episodeId: string
    onCommentAdded: () => void
}

export default function CommentForm({ episodeId, onCommentAdded }: CommentFormProps) {
    const { user } = useAuth()
    const [commentText, setCommentText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !commentText.trim()) return

        setIsSubmitting(true)
        setError(null)

        try {
            const response = await fetch('/api/episode-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    episode_id: episodeId,
                    comment_text: commentText.trim()
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to post comment')
            }

            setCommentText('')
            onCommentAdded()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to post comment')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!user) {
        return (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-darkInput text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Sign in to leave a comment
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment... Use @username to mention someone"
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-darkInput text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                rows={3}
                maxLength={2000}
                disabled={isSubmitting}
            />

            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {commentText.length}/2000
                </span>

                <button
                    type="submit"
                    disabled={isSubmitting || !commentText.trim()}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
            </div>

            {error && (
                <p className="text-red-500 text-sm">{error}</p>
            )}
        </form>
    )
}
