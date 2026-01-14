'use client'

import { useState, useRef, useEffect } from 'react'
import ShareReviewCard from './ShareReviewCard'
import { generateScreenshot, copyImageToClipboard, downloadImage, fetchImageAsBase64 } from '@/lib/utils/screenshot'
import { openTwitterIntent, formatShareTweet, getAnimePageUrl } from '@/lib/utils/twitter'
import { slugify } from '@/lib/utils/slugify'
import {
    trackReviewShareCompleted,
    trackReviewShareCancelled
} from '@/lib/analytics/events'

interface SharePreviewModalProps {
    isOpen: boolean
    onClose: () => void
    animeId: number
    animeTitle: string
    animeSlug: string
    bannerUrl: string | null
    username: string
    displayName: string | null
    rating: number
    reviewText: string
}

export default function SharePreviewModal({
    isOpen,
    onClose,
    animeId,
    animeTitle,
    animeSlug,
    bannerUrl,
    username,
    displayName,
    rating,
    reviewText
}: SharePreviewModalProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showTooltip, setShowTooltip] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const blobRef = useRef<Blob | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadAndGenerate()
        }
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [isOpen])

    const loadAndGenerate = async () => {
        setLoading(true)
        setError(null)

        try {
            if (bannerUrl) {
                const dataUrl = await fetchImageAsBase64(bannerUrl)
                setBannerDataUrl(dataUrl)
            }

            await new Promise(resolve => setTimeout(resolve, 200))

            if (!cardRef.current) {
                setError('Failed to generate preview')
                setLoading(false)
                return
            }

            const blob = await generateScreenshot(cardRef.current)
            blobRef.current = blob
            const url = URL.createObjectURL(blob)
            setPreviewUrl(url)
        } catch (err) {
            console.error('Screenshot failed:', err)
            setError('Failed to generate preview')
        } finally {
            setLoading(false)
        }
    }

    const handleShare = async () => {
        if (!blobRef.current) return

        const copied = await copyImageToClipboard(blobRef.current)

        if (copied) {
            setShowTooltip(true)
            setTimeout(() => setShowTooltip(false), 3000)

            trackReviewShareCompleted({
                anime_title: animeTitle,
                anime_id: animeId,
                method: 'clipboard'
            })
        } else {
            await downloadImage(blobRef.current, `${slugify(animeTitle)}-review.png`)
            trackReviewShareCompleted({
                anime_title: animeTitle,
                anime_id: animeId,
                method: 'download'
            })
        }

        const animeUrl = getAnimePageUrl(animeSlug)
        const tweetText = formatShareTweet(animeTitle, rating, animeUrl)
        openTwitterIntent(tweetText)

        onClose()
    }

    const handleClose = () => {
        trackReviewShareCancelled({
            anime_title: animeTitle,
            anime_id: animeId
        })
        onClose()
    }

    if (!isOpen) return null

    return (
        <>
            <ShareReviewCard
                ref={cardRef}
                animeTitle={animeTitle}
                bannerDataUrl={bannerDataUrl}
                username={username}
                displayName={displayName}
                rating={rating}
                reviewText={reviewText}
            />

            <div
                className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) handleClose()
                }}
            >
                <div className="relative bg-white dark:bg-darkInput rounded-lg w-full max-w-2xl overflow-hidden">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dark:text-white">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>

                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Share Review on X</h3>

                        <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black dark:border-gray-600 dark:border-t-white" />
                                </div>
                            ) : error ? (
                                <div className="absolute inset-0 flex items-center justify-center text-red-500">
                                    {error}
                                </div>
                            ) : previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Review preview"
                                    className="w-full h-full object-contain"
                                />
                            ) : null}
                        </div>

                        {showTooltip && (
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                                Image copied! Paste it in the X composer.
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={loading || !!error}
                                className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                Share on X
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
