'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface UnauthenticatedWatchlistOverlayProps {
    isOpen: boolean
    onClose: () => void
    onCreateAccount: () => void
}

export default function UnauthenticatedWatchlistOverlay({
    isOpen,
    onClose,
    onCreateAccount
}: UnauthenticatedWatchlistOverlayProps) {
    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    // Prevent body scroll when overlay is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    const overlayContent = (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                // Close if clicking on backdrop
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                </svg>
            </button>

            {/* Content */}
            <div className="flex flex-col items-center justify-center text-center px-4 max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
                    To be able to create a watchlist,<br />please create an account!
                </h2>
                <button
                    onClick={onCreateAccount}
                    className="px-8 py-4 bg-white text-black rounded-md hover:bg-gray-100 transition-colors font-semibold text-lg"
                >
                    Create an Account
                </button>
            </div>
        </div>
    )

    return createPortal(overlayContent, document.body)
}
