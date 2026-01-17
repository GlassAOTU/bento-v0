'use client'

import { useState, useEffect } from 'react'
import { ScaleLoader } from 'react-spinners'
import ClearConfirmDialog from './ClearConfirmDialog'
import AuthModal from './AuthModal'
import { useAuth } from '@/lib/auth/AuthContext'
import {
    trackRecommendationShareClicked,
    trackRecommendationShareCreated,
    trackRecommendationClearConfirmed
} from '@/lib/analytics/events'

type Props = {
    recommendations: Array<{
        title: string
        reason: string
        description: string
        image: string
        externalLinks: { url: string; site: string } | null
        trailer: { id: string; site: string } | null
    }>
    prompt: string
    tags: string[]
    onClear: () => void
}

export default function RecommendationToolbar({ recommendations, prompt, tags, onClear }: Props) {
    const { user } = useAuth()
    const [isVisible, setIsVisible] = useState(false)
    const [isSharing, setIsSharing] = useState(false)
    const [showClearDialog, setShowClearDialog] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [shareError, setShareError] = useState<string | null>(null)
    const [shareSuccess, setShareSuccess] = useState(false)

    useEffect(() => {
        setIsVisible(recommendations.length > 0)
    }, [recommendations.length])

    const handleShare = async () => {
        if (!user) {
            setShowAuthModal(true)
            return
        }

        trackRecommendationShareClicked({ count: recommendations.length })
        setIsSharing(true)
        setShareError(null)

        try {
            const res = await fetch('/api/recommendations/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recommendations,
                    prompt,
                    tags
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setShareError(data.error || 'Failed to share')
                return
            }

            await navigator.clipboard.writeText(data.url)
            setShareSuccess(true)
            trackRecommendationShareCreated({
                shortcode: data.shortcode,
                count: recommendations.length
            })

            setTimeout(() => setShareSuccess(false), 3000)
        } catch (err) {
            console.error('Share error:', err)
            setShareError('Failed to share recommendations')
        } finally {
            setIsSharing(false)
        }
    }

    const handleClear = () => {
        trackRecommendationClearConfirmed({ count: recommendations.length })
        onClear()
    }

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (!isVisible) return null

    return (
        <>
            <div
                className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
                }`}
            >
                <div className="flex items-center gap-2 bg-white dark:bg-darkInput border border-gray-300 dark:border-gray-700 rounded-full px-4 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-lg">
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-pink-400 dark:hover:text-pink-300 transition-colors rounded-full disabled:opacity-50"
                    >
                        {isSharing ? (
                            <ScaleLoader height={14} color="#6b7280" />
                        ) : shareSuccess ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6 9 17l-5-5"/>
                                </svg>
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                                    <polyline points="16 6 12 2 8 6"/>
                                    <line x1="12" y1="2" x2="12" y2="15"/>
                                </svg>
                                <span>Share</span>
                            </>
                        )}
                    </button>

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

                    <button
                        onClick={() => setShowClearDialog(true)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                        <span>Clear</span>
                    </button>

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

                    <button
                        onClick={scrollToTop}
                        className="flex items-center justify-center w-10 h-10 text-gray-600 dark:text-gray-300 hover:text-mySecondary dark:hover:text-white transition-colors rounded-full"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6"/>
                        </svg>
                    </button>
                </div>

                {shareError && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                        {shareError}
                    </div>
                )}
            </div>

            <ClearConfirmDialog
                isOpen={showClearDialog}
                onClose={() => setShowClearDialog(false)}
                onConfirm={handleClear}
            />

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialView="signin"
            />
        </>
    )
}
