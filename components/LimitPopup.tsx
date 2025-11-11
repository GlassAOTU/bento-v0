'use client'

import { useEffect, useState } from 'react'

type LimitPopupProps = {
    message: string
    onClose: () => void
    resetAt?: string | null
    isAuthenticated?: boolean
    onAuthPrompt?: (view: 'signup' | 'signin') => void
}

export default function LimitPopup({ message, onClose, resetAt, isAuthenticated = false, onAuthPrompt }: LimitPopupProps) {
    const [timeUntilReset, setTimeUntilReset] = useState<string>('')

    useEffect(() => {
        if (!resetAt) return

        const updateTimer = () => {
            const now = new Date().getTime()
            const reset = new Date(resetAt).getTime()
            const diff = reset - now

            if (diff <= 0) {
                setTimeUntilReset('Now available')
                // Auto-close and refresh when rate limit expires
                setTimeout(() => {
                    localStorage.removeItem('rateLimited')
                    localStorage.removeItem('rateLimitInfo')
                    onClose()
                    window.location.reload()
                }, 1000)
                return
            }

            const minutes = Math.floor(diff / 60000)
            const seconds = Math.floor((diff % 60000) / 1000)
            setTimeUntilReset(`${minutes}m ${seconds}s`)
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [resetAt, onClose])

    const handleAuthClick = (view: 'signup' | 'signin') => {
        // Save current state to sessionStorage
        sessionStorage.setItem('auth_flow_in_progress', 'true')
        sessionStorage.setItem('auth_return_url', '/recommendation')

        // Close the rate limit popup
        onClose()

        // Trigger auth modal
        if (onAuthPrompt) {
            onAuthPrompt(view)
        }
    }

    return (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black/80">
            <div className="bg-white shadow-lg rounded-lg p-8 max-w-md mx-4 relative">
                {/* Close X Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>

                <div className="flex flex-col gap-4">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-center text-black">Rate Limit Reached</h2>

                    {/* Message */}
                    <p className="text-center text-gray-700">{message}</p>

                    {/* Timer */}
                    {timeUntilReset && (
                        <div className="text-center py-3 px-4 bg-gray-100 rounded-lg">
                            <p className="text-sm text-gray-600">Try again in</p>
                            <p className="text-2xl font-bold text-black">{timeUntilReset}</p>
                        </div>
                    )}

                    {/* CTA Buttons */}
                    {!isAuthenticated ? (
                        <div className="flex flex-col gap-3 mt-2">
                            <button
                                onClick={() => handleAuthClick('signup')}
                                className="w-full py-3 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                            >
                                Sign Up for Higher Limits
                            </button>
                            <button
                                onClick={() => handleAuthClick('signin')}
                                className="w-full py-3 px-4 border-2 border-black text-black rounded-lg hover:bg-gray-100 transition-colors font-medium"
                            >
                                Log In
                            </button>
                            <p className="text-xs text-center text-gray-500">
                                Get 10 requests per 10 minutes with an account (vs 3 for anonymous users)
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-center text-gray-600">
                            You've reached the authenticated user limit. Please wait for the timer to reset.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}