'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/browser-client'
import { X } from 'lucide-react'
import UnauthenticatedWatchlistOverlay from './UnauthenticatedWatchlistOverlay'
import AuthModal from './AuthModal'
import {
    trackWatchlistModalOpened,
    trackWatchlistUnauthenticatedPrompt,
    trackWatchlistAnimeAdded,
    trackWatchlistCreated,
    trackWatchlistDuplicatePrevented,
    getAuthStatus
} from '@/lib/analytics/events'

interface Watchlist {
    id: string
    name: string
    description: string | null
}

interface AnimeItem {
    title: string
    reason: string
    description: string
    image: string
    externalLinks: { url: string; site: string } | null
    trailer: { id: string, site: string } | null
}

interface WatchlistModalProps {
    isOpen: boolean
    onClose: () => void
    anime: AnimeItem | null
}

export default function WatchlistModal({ isOpen, onClose, anime }: WatchlistModalProps) {
    const [watchlists, setWatchlists] = useState<Watchlist[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [view, setView] = useState<'select' | 'create'>('select')
    const [newWatchlistName, setNewWatchlistName] = useState('')
    const [newWatchlistDescription, setNewWatchlistDescription] = useState('')
    const [creating, setCreating] = useState(false)
    const [adding, setAdding] = useState(false)
    const [success, setSuccess] = useState(false)
    const [successWatchlistName, setSuccessWatchlistName] = useState('')
    const [mounted, setMounted] = useState(false)
    const [showUnauthOverlay, setShowUnauthOverlay] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)

    // Set mounted state on client side
    useEffect(() => {
        setMounted(true)
    }, [])

    // Fetch user's watchlists and prevent body scroll
    useEffect(() => {
        if (isOpen) {
            fetchWatchlists()
            setSuccess(false)
            setSuccessWatchlistName('')
            setShowUnauthOverlay(false)
            setShowAuthModal(false)
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden'
        } else {
            // Re-enable body scroll when modal is closed
            document.body.style.overflow = 'unset'
        }

        // Cleanup function to ensure scroll is re-enabled
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, anime])

    // Listen for auth state changes
    useEffect(() => {
        const supabase = createClient()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user && showAuthModal) {
                // User successfully signed in, close auth modal and main modal
                setShowAuthModal(false)
                setShowUnauthOverlay(false)
                onClose()
            }
        })

        return () => subscription.unsubscribe()
    }, [showAuthModal, onClose])

    const fetchWatchlists = async () => {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            // Check if user is authenticated
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setLoading(false)
                setShowUnauthOverlay(true)

                // Track unauthenticated prompt
                if (anime) {
                    trackWatchlistUnauthenticatedPrompt({
                        anime_title: anime.title
                    })
                }

                return
            }

            const { data, error: fetchError } = await supabase
                .from('watchlists')
                .select('id, name, description')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (fetchError) {
                console.error('Error fetching watchlists:', fetchError)
                setError('Failed to load watchlists')
            } else {
                const watchlistData = data || []
                setWatchlists(watchlistData)

                // Track modal opened
                if (anime) {
                    trackWatchlistModalOpened({
                        anime_title: anime.title,
                        has_existing_watchlists: watchlistData.length > 0,
                        watchlist_count: watchlistData.length,
                        auth_status: 'authenticated'
                    })
                }
            }
        } catch (err) {
            console.error('Error fetching watchlists:', err)
            setError('Failed to load watchlists')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateWatchlist = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!newWatchlistName.trim()) {
            setError('Please enter a watchlist name')
            return
        }

        setCreating(true)
        setError(null)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError('You must be signed in to create watchlists')
                setCreating(false)
                return
            }

            const { data, error: createError } = await supabase
                .from('watchlists')
                .insert({
                    user_id: user.id,
                    name: newWatchlistName.trim(),
                    description: newWatchlistDescription.trim() || null
                })
                .select()
                .single()

            if (createError) {
                console.error('Error creating watchlist:', createError)
                setError(`Failed to create watchlist: ${createError.message}`)
            } else if (data && anime) {
                // Track watchlist created
                trackWatchlistCreated({
                    watchlist_name: data.name,
                    watchlist_id: data.id,
                    created_with_anime: true,
                    anime_title: anime.title
                })

                // Add the anime to the newly created watchlist
                // Update watchlists state to include the new one
                setWatchlists([...watchlists, { id: data.id, name: data.name, description: data.description }])
                await addAnimeToWatchlist(data.id)
            }
        } catch (err) {
            console.error('Error creating watchlist:', err)
            setError('Failed to create watchlist')
        } finally {
            setCreating(false)
        }
    }

    const addAnimeToWatchlist = async (watchlistId: string) => {
        if (!anime) return

        setAdding(true)
        setError(null)

        try {
            const supabase = createClient()

            // Find the watchlist name
            const watchlist = watchlists.find(w => w.id === watchlistId)
            const watchlistName = watchlist?.name || 'your watchlist'

            // Check if anime already exists in this watchlist
            const { data: existingItem, error: checkError } = await supabase
                .from('watchlist_items')
                .select('id')
                .eq('watchlist_id', watchlistId)
                .eq('title', anime.title)
                .maybeSingle()

            if (checkError) {
                console.error('Error checking for duplicate:', checkError)
                setError(`Failed to check watchlist: ${checkError.message}`)
                setAdding(false)
                return
            }

            if (existingItem) {
                setError(`"${anime.title}" is already in ${watchlistName}`)

                // Track duplicate prevented
                trackWatchlistDuplicatePrevented({
                    anime_title: anime.title,
                    watchlist_name: watchlistName
                })

                setAdding(false)
                return
            }

            const { error: addError } = await supabase
                .from('watchlist_items')
                .insert({
                    watchlist_id: watchlistId,
                    title: anime.title,
                    reason: anime.reason,
                    description: anime.description,
                    image: anime.image,
                    external_links: anime.externalLinks,
                    trailer: anime.trailer
                })

            if (addError) {
                console.error('Error adding to watchlist:', addError)
                setError(`Failed to add anime to watchlist: ${addError.message}`)
            } else {
                // Track anime added to watchlist
                trackWatchlistAnimeAdded({
                    anime_title: anime.title,
                    watchlist_name: watchlistName,
                    watchlist_id: watchlistId,
                    auth_status: 'authenticated'
                })

                // Success! Show success message
                setSuccess(true)
                setSuccessWatchlistName(watchlistName)
                // Close modal after 2 seconds
                setTimeout(() => {
                    onClose()
                    // Reset state
                    setView('select')
                    setNewWatchlistName('')
                    setNewWatchlistDescription('')
                }, 2000)
            }
        } catch (err) {
            console.error('Error adding to watchlist:', err)
            setError('Failed to add anime to watchlist')
        } finally {
            setAdding(false)
        }
    }

    const handleCreateAccount = () => {
        // Track auth initiated from watchlist
        if (anime) {
            const { trackWatchlistAuthInitiated } = require('@/lib/analytics/events')
            trackWatchlistAuthInitiated({
                anime_title_attempting_to_add: anime.title,
                auth_action: 'signup'
            })
        }

        // Store current page for OAuth return using a cookie (persists across redirects)
        // Cookie expires in 10 minutes (enough time for OAuth flow)
        document.cookie = `auth_return_url=${encodeURIComponent(window.location.pathname)}; path=/; max-age=600; SameSite=Lax`

        // Mark auth flow in progress in sessionStorage (for cache restoration logic)
        sessionStorage.setItem('auth_flow_in_progress', 'true')

        setShowUnauthOverlay(false)
        setShowAuthModal(true)
    }

    const handleCloseUnauthOverlay = () => {
        setShowUnauthOverlay(false)
        onClose()
    }

    const handleCloseAuthModal = () => {
        setShowAuthModal(false)
        onClose()
    }

    if (!isOpen || !mounted) return null

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                // Close modal if clicking on backdrop
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Add to Watchlist</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-8">
                            <div className="mb-4 text-6xl">✓</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Added to Watchlist!</h3>
                            <p className="text-gray-600 mb-1">{anime?.title}</p>
                            <p className="text-sm text-gray-500">was added to <span className="font-medium">{successWatchlistName}</span></p>
                        </div>
                    ) : (
                        <>
                            {anime && (
                                <div className="mb-6 pb-6 border-b border-gray-200">
                                    <p className="text-sm text-gray-500 mb-1">Adding:</p>
                                    <p className="font-semibold text-gray-900">{anime.title}</p>
                                </div>
                            )}

                            {view === 'select' && (
                        <div>
                            {loading ? (
                                <div className="text-center py-8 text-gray-500">
                                    Loading watchlists...
                                </div>
                            ) : watchlists.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 mb-4">You don't have any watchlists yet.</p>
                                    <button
                                        onClick={() => setView('create')}
                                        className="w-full py-3 bg-[#F9F9F9] text-black rounded-[6px] border-[0.5px] border-black hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        Create Your First Watchlist
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-600 mb-3">Select a watchlist:</p>
                                    <div className="space-y-2 mb-4">
                                        {watchlists.map((watchlist) => (
                                            <button
                                                key={watchlist.id}
                                                onClick={() => addAnimeToWatchlist(watchlist.id)}
                                                disabled={adding}
                                                className="w-full text-left p-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <p className="font-medium text-gray-900">{watchlist.name}</p>
                                                {watchlist.description && (
                                                    <p className="text-sm text-gray-500 mt-1">{watchlist.description}</p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setView('create')}
                                        className="w-full py-3 bg-[#F9F9F9] text-black rounded-[6px] border-[0.5px] border-black hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        Create New Watchlist
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'create' && (
                        <div>
                            <form onSubmit={handleCreateWatchlist}>
                                <div className="mb-4">
                                    <label htmlFor="watchlist-name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Watchlist Name *
                                    </label>
                                    <input
                                        id="watchlist-name"
                                        type="text"
                                        value={newWatchlistName}
                                        onChange={(e) => setNewWatchlistName(e.target.value)}
                                        placeholder="e.g., Must Watch, Action Anime, etc."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                        maxLength={100}
                                        required
                                    />
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="watchlist-description" className="block text-sm font-medium text-gray-700 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        id="watchlist-description"
                                        value={newWatchlistDescription}
                                        onChange={(e) => setNewWatchlistDescription(e.target.value)}
                                        placeholder="What's this watchlist for?"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                                        rows={3}
                                        maxLength={500}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setView('select')
                                            setNewWatchlistName('')
                                            setNewWatchlistDescription('')
                                            setError(null)
                                        }}
                                        disabled={creating}
                                        className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-[6px] hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating || !newWatchlistName.trim()}
                                        className="flex-1 py-3 bg-[#F9F9F9] text-black rounded-[6px] border-[0.5px] border-black hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {creating ? 'Creating...' : 'Create & Add'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* Unauthenticated Overlay */}
            {showUnauthOverlay && (
                <UnauthenticatedWatchlistOverlay
                    isOpen={showUnauthOverlay}
                    onClose={handleCloseUnauthOverlay}
                    onCreateAccount={handleCreateAccount}
                />
            )}

            {/* Auth Modal */}
            {showAuthModal && createPortal(
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={handleCloseAuthModal}
                    initialView="signup"
                />,
                document.body
            )}

            {/* Regular Watchlist Modal (only show if not showing overlay or auth) */}
            {!showUnauthOverlay && !showAuthModal && createPortal(modalContent, document.body)}
        </>
    )
}
