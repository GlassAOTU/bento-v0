'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/browser-client'
import { ChevronLeft } from 'lucide-react'
import { slugify } from '@/lib/utils/slugify'
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
    cover_image_url: string | null
    item_count: number
    preview_images: string[]
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
    const [selectedWatchlists, setSelectedWatchlists] = useState<Set<string>>(new Set())
    const [isExpanded, setIsExpanded] = useState(false)
    const [skippedWatchlists, setSkippedWatchlists] = useState<string[]>([])
    const [isPublic, setIsPublic] = useState(false)

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
            setSelectedWatchlists(new Set())
            setIsExpanded(false)
            setSkippedWatchlists([])
            setError(null)
            setIsPublic(false)
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

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
                .select('id, name, description, cover_image_url')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (fetchError) {
                console.error('Error fetching watchlists:', fetchError)
                setError('Failed to load watchlists')
            } else {
                const watchlistsWithCounts = await Promise.all(
                    (data || []).map(async (w) => {
                        const { count } = await supabase
                            .from('watchlist_items')
                            .select('*', { count: 'exact', head: true })
                            .eq('watchlist_id', w.id)
                        const { data: items } = await supabase
                            .from('watchlist_items')
                            .select('image')
                            .eq('watchlist_id', w.id)
                            .order('created_at', { ascending: false })
                            .limit(3)
                        const preview_images = (items || []).map(item => item.image).filter(Boolean)
                        return { ...w, item_count: count || 0, preview_images }
                    })
                )
                setWatchlists(watchlistsWithCounts)

                if (anime) {
                    trackWatchlistModalOpened({
                        anime_title: anime.title,
                        has_existing_watchlists: watchlistsWithCounts.length > 0,
                        watchlist_count: watchlistsWithCounts.length,
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
                    description: newWatchlistDescription.trim() || null,
                    slug: slugify(newWatchlistName.trim()),
                    is_public: isPublic
                })
                .select()
                .single()

            if (createError) {
                console.error('Error creating watchlist:', createError)
                setError(`Failed to create watchlist: ${createError.message}`)
            } else if (data && anime) {
                trackWatchlistCreated({
                    watchlist_name: data.name,
                    watchlist_id: data.id,
                    created_with_anime: true,
                    anime_title: anime.title
                })

                setWatchlists([...watchlists, {
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    cover_image_url: null,
                    item_count: 0,
                    preview_images: []
                }])
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

            // Try to get TMDB data and cache image
            let finalImageUrl = anime.image
            let tmdbId: number | null = null
            let imageSource = 'external'

            try {
                // Look up TMDB data
                const tmdbResponse = await fetch(
                    `/api/anime/tmdb-lookup?title=${encodeURIComponent(anime.title)}`
                )
                const tmdbData = await tmdbResponse.json()

                if (tmdbData.tmdb_id && tmdbData.poster_url) {
                    tmdbId = tmdbData.tmdb_id
                    finalImageUrl = tmdbData.poster_url
                    imageSource = 'tmdb'
                }
            } catch (err) {
                console.warn('TMDB lookup failed, using original image:', err)
            }

            const { error: addError } = await supabase
                .from('watchlist_items')
                .insert({
                    watchlist_id: watchlistId,
                    title: anime.title,
                    reason: anime.reason,
                    description: anime.description,
                    image: finalImageUrl,
                    tmdb_id: tmdbId,
                    image_source: imageSource,
                    original_image_url: anime.image,
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

                // Regenerate cover image if watchlist has 3+ items (fire-and-forget)
                const { count } = await supabase
                    .from('watchlist_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('watchlist_id', watchlistId)

                if (count && count >= 3) {
                    fetch(`/api/watchlists/${watchlistId}/generate-cover`, { method: 'POST' })
                        .catch(err => console.warn('Cover generation failed:', err))
                }

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
            <div className="bg-white dark:bg-gray-900 rounded-[10px] w-[520px] max-w-[calc(100vw-32px)] max-h-[90vh] overflow-y-auto border border-black/20 dark:border-gray-700" style={{ borderWidth: '0.5px' }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            {(isExpanded || view === 'create') && !success && (
                                <button
                                    onClick={() => {
                                        if (view === 'create') {
                                            setView('select')
                                            setNewWatchlistName('')
                                            setNewWatchlistDescription('')
                                            setError(null)
                                        } else {
                                            setIsExpanded(false)
                                        }
                                    }}
                                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors -ml-1"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-black dark:text-white">
                                    {view === 'create' ? 'New Watchlist' : isExpanded ? 'All Watchlists' : 'Add to Watchlist'}
                                </h2>
                                {!success && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        {view === 'create' ? 'Create a new collection' : isExpanded ? 'Select a list to add to' : 'Save this show for later'}
                                    </p>
                                )}
                            </div>
                        </div>
                        {anime && !success && view !== 'create' && (
                            <img
                                src={anime.image}
                                alt={anime.title}
                                className="w-16 h-16 rounded-lg object-cover bg-gray-200"
                            />
                        )}
                    </div>
                </div>

                {/* Divider */}
                {!success && view === 'select' && <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />}

                {/* Content */}
                <div className="p-4 pt-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div
                            className="text-center py-8 cursor-pointer"
                            onClick={() => {
                                onClose()
                                setView('select')
                                setNewWatchlistName('')
                                setNewWatchlistDescription('')
                            }}
                        >
                            {anime && (
                                <img
                                    src={anime.image}
                                    alt={anime.title}
                                    className="w-24 h-32 rounded-lg object-cover mx-auto mb-4"
                                />
                            )}
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Added to {successWatchlistName}!
                            </h3>
                            {skippedWatchlists.length > 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    Already in {skippedWatchlists.join(', ')}
                                </p>
                            )}
                            <p className="text-sm text-gray-400 dark:text-gray-500">Click anywhere to continue</p>
                        </div>
                    ) : (
                        <>

                            {view === 'select' && (
                        <div>
                            {loading ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Loading watchlists...
                                </div>
                            ) : watchlists.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have any watchlists yet.</p>
                                    <button
                                        onClick={() => setView('create')}
                                        className="w-full py-4 bg-[#F9F9F9] dark:bg-gray-800 text-black dark:text-white rounded-[10px] border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
                                    >
                                        Create your first watchlist
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Select a list</p>
                                        {watchlists.length > 2 && !isExpanded && (
                                            <button
                                                onClick={() => setIsExpanded(true)}
                                                className="text-sm text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300 font-medium"
                                            >
                                                View all lists
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3 mb-4">
                                        {(isExpanded ? watchlists : watchlists.slice(0, 2)).map((watchlist) => {
                                            const isSelected = selectedWatchlists.has(watchlist.id)
                                            return (
                                                <button
                                                    key={watchlist.id}
                                                    onClick={() => {
                                                        setSelectedWatchlists(prev => {
                                                            const next = new Set(prev)
                                                            if (next.has(watchlist.id)) {
                                                                next.delete(watchlist.id)
                                                            } else {
                                                                next.add(watchlist.id)
                                                            }
                                                            return next
                                                        })
                                                    }}
                                                    disabled={adding}
                                                    className="w-full flex items-center gap-4 p-4 rounded-[10px] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <img
                                                        src={watchlist.cover_image_url || '/images/defaultwatchlistdisplay.png'}
                                                        alt={watchlist.name}
                                                        className="w-[160px] h-[80px] rounded-lg object-cover flex-shrink-0"
                                                    />
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="font-semibold text-black dark:text-white">
                                                            {watchlist.name} <span className="text-gray-400 dark:text-gray-500 font-normal">•</span> <span className="text-gray-500 dark:text-gray-400 font-normal">{watchlist.item_count} {watchlist.item_count === 1 ? 'item' : 'items'}</span>
                                                        </p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                                                        isSelected ? 'border-pink-300 bg-pink-300' : 'border-gray-300 dark:border-gray-600'
                                                    }`} />
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {selectedWatchlists.size > 0 ? (
                                        <button
                                            onClick={() => {
                                                selectedWatchlists.forEach(id => addAnimeToWatchlist(id))
                                            }}
                                            disabled={adding}
                                            className="w-full py-3 bg-pink-300 text-pink-900 rounded-xl hover:bg-pink-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {adding ? 'Adding...' : 'Add?'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setView('create')}
                                            className="w-full py-4 bg-[#F9F9F9] dark:bg-gray-800 text-black dark:text-white rounded-[10px] border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
                                        >
                                            Create new watchlist
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'create' && (
                        <div>
                            <form onSubmit={handleCreateWatchlist}>
                                <div className="mb-4">
                                    <label htmlFor="watchlist-name" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Watchlist Name
                                    </label>
                                    <input
                                        id="watchlist-name"
                                        type="text"
                                        value={newWatchlistName}
                                        onChange={(e) => setNewWatchlistName(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent"
                                        maxLength={100}
                                        required
                                    />
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="watchlist-description" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        id="watchlist-description"
                                        value={newWatchlistDescription}
                                        onChange={(e) => setNewWatchlistDescription(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent resize-none"
                                        rows={3}
                                        maxLength={500}
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Visibility
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsPublic(true)}
                                            className={`p-4 rounded-xl border transition-colors ${
                                                isPublic ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            <svg className="w-6 h-6 mx-auto mb-2 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                                                <path strokeWidth="1.5" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                            </svg>
                                            <p className="font-medium text-gray-900 dark:text-white">Public</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Visible to everyone</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsPublic(false)}
                                            className={`p-4 rounded-xl border transition-colors ${
                                                !isPublic ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            <svg className="w-6 h-6 mx-auto mb-2 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="1.5"/>
                                                <path strokeWidth="1.5" d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                            <p className="font-medium text-gray-900 dark:text-white">Private</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Only you can see this</p>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={creating || !newWatchlistName.trim()}
                                    className="w-full py-3 bg-[#F9F9F9] dark:bg-gray-800 text-black dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {creating ? 'Creating...' : 'Create Watchlist'}
                                </button>
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
