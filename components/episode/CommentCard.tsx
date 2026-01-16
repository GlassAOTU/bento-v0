'use client'

import { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface CommentCardProps {
    comment: {
        id: string
        username: string
        display_name: string | null
        avatar_url: string | null
        comment_text: string
        created_at: string
    }
    isOwn?: boolean
}

function parseMentions(text: string): ReactNode[] {
    const mentionRegex = /@([a-z0-9_-]{3,20})/gi
    const parts: ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index))
        }
        const username = match[1]
        parts.push(
            <Link
                key={`${match.index}-${username}`}
                href={`/${username}`}
                className="text-blue-500 hover:underline"
            >
                @{username}
            </Link>
        )
        lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
    }

    return parts
}

export default function CommentCard({ comment, isOwn }: CommentCardProps) {
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
                <Link href={`/${comment.username}`} className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        {comment.avatar_url ? (
                            <Image
                                src={comment.avatar_url}
                                alt={comment.username}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white text-sm font-bold">
                                {comment.username.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                </Link>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link
                                href={`/${comment.username}`}
                                className="font-medium hover:underline truncate dark:text-white"
                            >
                                @{comment.username}
                            </Link>
                            {isOwn && (
                                <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded">You</span>
                            )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {formatDate(comment.created_at)}
                        </span>
                    </div>

                    <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                        {parseMentions(comment.comment_text)}
                    </p>
                </div>
            </div>
        </div>
    )
}
