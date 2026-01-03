'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

const RESERVED_USERNAMES = [
    'discover', 'watchlists', 'anime', 'api', 'auth', 'profile',
    'settings', 'admin', 'help', 'about', 'terms', 'privacy',
    'login', 'signup', 'register', 'signout', 'logout', 'search',
    'explore', 'home', 'feed', 'notifications', 'messages', 'user'
]

type UsernameSetupModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function UsernameSetupModal({ isOpen, onClose, onSuccess }: UsernameSetupModalProps) {
    const [username, setUsername] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [bio, setBio] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [checkingUsername, setCheckingUsername] = useState(false)
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
    const [usernameTouched, setUsernameTouched] = useState(false)

    // Username validation regex
    const usernameRegex = /^[a-z0-9_-]{3,20}$/
    const isUsernameFormatValid = username.length === 0 || usernameRegex.test(username.toLowerCase())
    const isReserved = RESERVED_USERNAMES.includes(username.toLowerCase())

    // Debounced username availability check
    useEffect(() => {
        if (!username || username.length < 3 || !isUsernameFormatValid) {
            setUsernameAvailable(null)
            return
        }

        // Early check for reserved usernames
        if (isReserved) {
            setUsernameAvailable(false)
            return
        }

        setCheckingUsername(true)
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/profile/check-username/${username.toLowerCase()}`)
                const data = await response.json()

                if (data.error) {
                    setUsernameAvailable(false)
                } else {
                    setUsernameAvailable(data.available)
                }
            } catch (err) {
                console.error('Error checking username:', err)
            } finally {
                setCheckingUsername(false)
            }
        }, 500) // 500ms debounce

        return () => clearTimeout(timer)
    }, [username, isUsernameFormatValid, isReserved])

    // Pre-fill display name from user metadata if available
    useEffect(() => {
        if (isOpen) {
            const fetchUserData = async () => {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    // Try to get name from OAuth metadata
                    const name = user.user_metadata?.full_name ||
                                user.user_metadata?.name ||
                                user.email?.split('@')[0] || ''

                    setDisplayName(name)
                }
            }

            fetchUserData()
        }
    }, [isOpen])

    // Clear form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setUsername('')
            setDisplayName('')
            setBio('')
            setError(null)
            setUsernameTouched(false)
            setUsernameAvailable(null)
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!username || !isUsernameFormatValid || usernameAvailable === false) {
            setError('Please enter a valid username')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError('You must be signed in to create a profile')
                setLoading(false)
                return
            }

            // Get avatar URL from user metadata if available
            const avatarUrl = user.user_metadata?.avatar_url ||
                            user.user_metadata?.picture ||
                            null

            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.toLowerCase(),
                    display_name: displayName || null,
                    bio: bio || null,
                    avatar_url: avatarUrl
                })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Failed to create profile')
                setLoading(false)
                return
            }

            // Success!
            onSuccess()
            onClose()
        } catch (err) {
            console.error('Error creating profile:', err)
            setError('Failed to create profile. Please try again.')
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const canSubmit = username.length >= 3 &&
                     isUsernameFormatValid &&
                     !isReserved &&
                     usernameAvailable === true &&
                     !loading

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="relative bg-white dark:bg-darkBg rounded-lg w-full max-w-md p-8">
                <h2 className="text-4xl font-bold mb-2 text-center dark:text-white">Claim your username</h2>
                <p className="text-base text-gray-400 dark:text-gray-500 mb-8 text-center">
                    Choose a unique username for your public profile
                </p>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 text-sm">⚠️</span>
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Username Field */}
                    <div>
                        <label htmlFor="username" className="block text-base font-normal mb-2 dark:text-white">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                onBlur={() => setUsernameTouched(true)}
                                placeholder="yourhandle"
                                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-darkInput dark:text-white dark:placeholder-gray-500 ${
                                    usernameTouched && !isUsernameFormatValid
                                        ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                                        : usernameAvailable === false
                                        ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                                        : usernameAvailable === true
                                        ? 'border-green-300 dark:border-green-700 focus:ring-green-500'
                                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                                }`}
                            />
                            {checkingUsername && (
                                <div className="absolute right-3 top-3">
                                    <div className="animate-spin h-5 w-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full" />
                                </div>
                            )}
                        </div>

                        {/* Username validation feedback */}
                        {usernameTouched && username.length > 0 && !isUsernameFormatValid && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                Username must be 3-20 characters and contain only lowercase letters, numbers, underscores, and hyphens
                            </p>
                        )}
                        {isUsernameFormatValid && isReserved && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                This username is reserved
                            </p>
                        )}
                        {isUsernameFormatValid && !isReserved && usernameAvailable === false && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                Username is already taken
                            </p>
                        )}
                        {isUsernameFormatValid && usernameAvailable === true && (
                            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                                ✓ Username is available!
                            </p>
                        )}
                    </div>

                    {/* Display Name Field */}
                    <div>
                        <label htmlFor="display-name" className="block text-base font-normal mb-2 dark:text-white">
                            Display Name <span className="text-gray-400 dark:text-gray-500">(optional)</span>
                        </label>
                        <input
                            id="display-name"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-darkInput dark:text-white dark:placeholder-gray-500"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            This will be shown on your profile
                        </p>
                    </div>

                    {/* Bio Field */}
                    <div>
                        <label htmlFor="bio" className="block text-base font-normal mb-2 dark:text-white">
                            Bio <span className="text-gray-400 dark:text-gray-500">(optional)</span>
                        </label>
                        <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            rows={3}
                            maxLength={500}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-darkInput dark:text-white dark:placeholder-gray-500"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                            {bio.length}/500 characters
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full py-4 bg-[#F9F9F9] dark:bg-darkInput text-black dark:text-white rounded-[6px] border-[0.5px] border-black dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating profile...' : 'Create profile'}
                    </button>
                </form>

                <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                    You can update your profile information later in settings
                </p>
            </div>
        </div>
    )
}
