'use client'

import { useEffect, useState, useRef, useReducer } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/browser-client'
import { ChevronLeft } from 'lucide-react'
import { slugify } from '@/lib/utils/slugify'
import UnauthenticatedWatchlistOverlay from './UnauthenticatedWatchlistOverlay'
import AuthModal from './AuthModal'
import { useWatchlists, WatchlistSummary } from '@/lib/hooks/useWatchlists'
import {
    trackWatchlistModalOpened,
    trackWatchlistUnauthenticatedPrompt,
    trackWatchlistAnimeAdded,
    trackWatchlistCreated,
    trackWatchlistDuplicatePrevented,
} from '@/lib/analytics/events'

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

type ModalView = 'select' | 'select_expanded' | 'create' | 'success' | 'unauthenticated' | 'auth_modal'

type ModalState = {
    view: ModalView
    selectedWatchlists: Set<string>
    newWatchlistName: string
    newWatchlistDescription: string
    isPublic: boolean
    error: string | null
    submitting: boolean
    successWatchlistNames: string[]
    skippedWatchlists: string[]
}

type ModalAction =
    | { type: 'RESET' }
    | { type: 'SET_VIEW'; view: ModalView }
    | { type: 'TOGGLE_WATCHLIST'; id: string }
    | { type: 'SET_NAME'; name: string }
    | { type: 'SET_DESCRIPTION'; description: string }
    | { type: 'SET_PUBLIC'; isPublic: boolean }
    | { type: 'SET_ERROR'; error: string | null }
    | { type: 'START_SUBMIT' }
    | { type: 'ADD_SUCCESS'; watchlistName: string }
    | { type: 'ADD_SKIPPED'; watchlistName: string }
    | { type: 'FINISH_SUCCESS' }
    | { type: 'FINISH_ERROR'; error: string }

const initialState: ModalState = {
    view: 'select',
    selectedWatchlists: new Set(),
    newWatchlistName: '',
    newWatchlistDescription: '',
    isPublic: false,
    error: null,
    submitting: false,
    successWatchlistNames: [],
    skippedWatchlists: [],
}

function modalReducer(state: ModalState, action: ModalAction): ModalState {
    switch (action.type) {
        case 'RESET':
            return { ...initialState, selectedWatchlists: new Set() }
        case 'SET_VIEW':
            return { ...state, view: action.view, error: null }
        case 'TOGGLE_WATCHLIST': {
            const next = new Set(state.selectedWatchlists)
            if (next.has(action.id)) {
                next.delete(action.id)
            } else {
                next.add(action.id)
            }
            return { ...state, selectedWatchlists: next }
        }
        case 'SET_NAME':
            return { ...state, newWatchlistName: action.name }
        case 'SET_DESCRIPTION':
            return { ...state, newWatchlistDescription: action.description }
        case 'SET_PUBLIC':
            return { ...state, isPublic: action.isPublic }
        case 'SET_ERROR':
            return { ...state, error: action.error }
        case 'START_SUBMIT':
            return { ...state, submitting: true, error: null, successWatchlistNames: [], skippedWatchlists: [] }
        case 'ADD_SUCCESS':
            return { ...state, successWatchlistNames: [...state.successWatchlistNames, action.watchlistName] }
        case 'ADD_SKIPPED':
            return { ...state, skippedWatchlists: [...state.skippedWatchlists, action.watchlistName] }
        case 'FINISH_SUCCESS':
            return { ...state, submitting: false, view: 'success' }
        case 'FINISH_ERROR':
            return { ...state, submitting: false, error: action.error }
        default:
            return state
    }
}

export default function WatchlistModal({ isOpen, onClose, anime }: WatchlistModalProps) {
    const { data: watchlists = [], isLoading: loading, error: queryError, invalidate, isAuthenticated, authLoading } = useWatchlists()
    const [state, dispatch] = useReducer(modalReducer, initialState)
    const [mounted, setMounted] = useState(false)
    const hasTrackedOpen = useRef(false)

    const { view, selectedWatchlists, newWatchlistName, newWatchlistDescription, isPublic, error, submitting, successWatchlistNames, skippedWatchlists } = state
    const isExpanded = view === 'select_expanded'
    const showUnauthOverlay = view === 'unauthenticated'
    const showAuthModal = view === 'auth_modal'
    const success = view === 'success'

    // Set mounted state on client side
    useEffect(() => {
        setMounted(true)
    }, [])

    // Track modal open once when data is ready
    useEffect(() => {
        if (isOpen && !authLoading && isAuthenticated && !hasTrackedOpen.current && anime) {
            hasTrackedOpen.current = true
            trackWatchlistModalOpened({
                anime_title: anime.title,
                has_existing_watchlists: watchlists.length > 0,
                watchlist_count: watchlists.length,
                auth_status: 'authenticated'
            })
        }
    }, [isOpen, authLoading, isAuthenticated, watchlists.length, anime])

    // Reset state when modal opens/closes and handle scroll lock
    // Also immediately show unauth overlay if not authenticated
    useEffect(() => {
        if (isOpen) {
            dispatch({ type: 'RESET' })
            hasTrackedOpen.current = false
            document.body.style.overflow = 'hidden'

            // Immediately show unauth if auth is already resolved and user not authenticated
            if (!authLoading && !isAuthenticated) {
                dispatch({ type: 'SET_VIEW', view: 'unauthenticated' })
                if (anime) {
                    trackWatchlistUnauthenticatedPrompt({ anime_title: anime.title })
                }
            }
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, authLoading, isAuthenticated, anime])

    // Handle delayed auth resolution (e.g., if authLoading was true when modal opened)
    useEffect(() => {
        if (isOpen && !authLoading && !isAuthenticated && view === 'select') {
            dispatch({ type: 'SET_VIEW', view: 'unauthenticated' })
            if (anime) {
                trackWatchlistUnauthenticatedPrompt({ anime_title: anime.title })
            }
        }
    }, [isOpen, authLoading, isAuthenticated, anime, view])

    // Listen for auth state changes
    useEffect(() => {
        const supabase = createClient()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user && view === 'auth_modal') {
                onClose()
            }
        })

        return () => subscription.unsubscribe()
    }, [view, onClose])

    const handleCreateWatchlist = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!newWatchlistName.trim()) {
            dispatch({ type: 'SET_ERROR', error: 'Please enter a watchlist name' })
            return
        }

        dispatch({ type: 'START_SUBMIT' })

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                dispatch({ type: 'FINISH_ERROR', error: 'You must be signed in to create watchlists' })
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
                dispatch({ type: 'FINISH_ERROR', error: `Failed to create watchlist: ${createError.message}` })
            } else if (data && anime) {
                trackWatchlistCreated({
                    watchlist_name: data.name,
                    watchlist_id: data.id,
                    created_with_anime: true,
                    anime_title: anime.title
                })

                invalidate()
                await handleSingleAdd(data.id, data.name)
            }
        } catch (err) {
            console.error('Error creating watchlist:', err)
            dispatch({ type: 'FINISH_ERROR', error: 'Failed to create watchlist' })
        }
    }

    const addAnimeToSingleWatchlist = async (watchlistId: string, watchlistName: string): Promise<'success' | 'duplicate' | 'error'> => {
        if (!anime) return 'error'

        try {
            const supabase = createClient()

            const { data: existingItem, error: checkError } = await supabase
                .from('watchlist_items')
                .select('id')
                .eq('watchlist_id', watchlistId)
                .eq('title', anime.title)
                .maybeSingle()

            if (checkError) {
                console.error('Error checking for duplicate:', checkError)
                return 'error'
            }

            if (existingItem) {
                trackWatchlistDuplicatePrevented({
                    anime_title: anime.title,
                    watchlist_name: watchlistName
                })
                return 'duplicate'
            }

            let finalImageUrl = anime.image
            let tmdbId: number | null = null
            let imageSource = 'external'

            try {
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
                return 'error'
            }

            trackWatchlistAnimeAdded({
                anime_title: anime.title,
                watchlist_name: watchlistName,
                watchlist_id: watchlistId,
                auth_status: 'authenticated'
            })

            const { count } = await supabase
                .from('watchlist_items')
                .select('*', { count: 'exact', head: true })
                .eq('watchlist_id', watchlistId)

            if (count && count >= 3) {
                fetch(`/api/watchlists/${watchlistId}/generate-cover`, { method: 'POST' })
                    .catch(err => console.warn('Cover generation failed:', err))
            }

            return 'success'
        } catch (err) {
            console.error('Error adding to watchlist:', err)
            return 'error'
        }
    }

    const handleMultiAdd = async () => {
        if (!anime || selectedWatchlists.size === 0) return

        dispatch({ type: 'START_SUBMIT' })

        const ids = Array.from(selectedWatchlists)
        let hasSuccess = false
        let lastError: string | null = null

        for (const id of ids) {
            const watchlist = watchlists.find(w => w.id === id)
            const name = watchlist?.name || 'watchlist'

            const result = await addAnimeToSingleWatchlist(id, name)

            if (result === 'success') {
                dispatch({ type: 'ADD_SUCCESS', watchlistName: name })
                hasSuccess = true
            } else if (result === 'duplicate') {
                dispatch({ type: 'ADD_SKIPPED', watchlistName: name })
            } else {
                lastError = `Failed to add to ${name}`
            }
        }

        invalidate()

        if (hasSuccess) {
            dispatch({ type: 'FINISH_SUCCESS' })
            setTimeout(() => {
                onClose()
            }, 2000)
        } else if (lastError) {
            dispatch({ type: 'FINISH_ERROR', error: lastError })
        } else {
            dispatch({ type: 'FINISH_ERROR', error: 'Already in all selected watchlists' })
        }
    }

    const handleSingleAdd = async (watchlistId: string, watchlistName: string) => {
        dispatch({ type: 'START_SUBMIT' })

        const result = await addAnimeToSingleWatchlist(watchlistId, watchlistName)

        invalidate()

        if (result === 'success') {
            dispatch({ type: 'ADD_SUCCESS', watchlistName })
            dispatch({ type: 'FINISH_SUCCESS' })
            setTimeout(() => {
                onClose()
            }, 2000)
        } else if (result === 'duplicate') {
            dispatch({ type: 'FINISH_ERROR', error: `"${anime?.title}" is already in ${watchlistName}` })
        } else {
            dispatch({ type: 'FINISH_ERROR', error: 'Failed to add anime to watchlist' })
        }
    }

    const handleCreateAccount = () => {
        if (anime) {
            const { trackWatchlistAuthInitiated } = require('@/lib/analytics/events')
            trackWatchlistAuthInitiated({
                anime_title_attempting_to_add: anime.title,
                auth_action: 'signup'
            })
        }

        document.cookie = `auth_return_url=${encodeURIComponent(window.location.pathname)}; path=/; max-age=600; SameSite=Lax`
        sessionStorage.setItem('auth_flow_in_progress', 'true')

        dispatch({ type: 'SET_VIEW', view: 'auth_modal' })
    }

    const handleCloseUnauthOverlay = () => {
        onClose()
    }

    const handleCloseAuthModal = () => {
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
            <div className="bg-white dark:bg-darkBg rounded-[10px] w-[624px] max-w-[calc(100vw-32px)] max-h-[90vh] overflow-y-auto border border-black/20 dark:border-gray-700" style={{ borderWidth: '0.5px' }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            {(isExpanded || view === 'create') && !success && (
                                <button
                                    onClick={() => {
                                        if (view === 'create') {
                                            dispatch({ type: 'SET_VIEW', view: 'select' })
                                            dispatch({ type: 'SET_NAME', name: '' })
                                            dispatch({ type: 'SET_DESCRIPTION', description: '' })
                                        } else {
                                            dispatch({ type: 'SET_VIEW', view: 'select' })
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
                {!success && (view === 'select' || view === 'select_expanded') && <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />}

                {/* Content */}
                <div className="p-4 pt-4">
                    {(error || queryError) && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
                            {error || queryError?.message}
                        </div>
                    )}

                    {success ? (
                        <div
                            className="text-center py-8 cursor-pointer"
                            onClick={() => onClose()}
                        >
                            {anime && (
                                <img
                                    src={anime.image}
                                    alt={anime.title}
                                    className="w-24 h-32 rounded-lg object-cover mx-auto mb-4"
                                />
                            )}
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Added to {successWatchlistNames.join(', ')}!
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

                            {(view === 'select' || view === 'select_expanded') && (
                        <div>
                            {loading ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Loading watchlists...
                                </div>
                            ) : watchlists.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have any watchlists yet.</p>
                                    <button
                                        onClick={() => dispatch({ type: 'SET_VIEW', view: 'create' })}
                                        className="w-full py-4 bg-[#F9F9F9] dark:bg-darkInput text-black dark:text-white rounded-[10px] border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
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
                                                onClick={() => dispatch({ type: 'SET_VIEW', view: 'select_expanded' })}
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
                                                    onClick={() => dispatch({ type: 'TOGGLE_WATCHLIST', id: watchlist.id })}
                                                    disabled={submitting}
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
                                            onClick={handleMultiAdd}
                                            disabled={submitting}
                                            className="w-full py-3 bg-pink-300 text-pink-900 rounded-xl hover:bg-pink-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? 'Adding...' : 'Add?'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => dispatch({ type: 'SET_VIEW', view: 'create' })}
                                            className="w-full py-4 bg-[#F9F9F9] dark:bg-darkInput text-black dark:text-white rounded-[10px] border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
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
                                        onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-darkInput text-black dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent"
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
                                        onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', description: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-darkInput text-black dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent resize-none"
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
                                            onClick={() => dispatch({ type: 'SET_PUBLIC', isPublic: true })}
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
                                            onClick={() => dispatch({ type: 'SET_PUBLIC', isPublic: false })}
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
                                    disabled={submitting || !newWatchlistName.trim()}
                                    className="w-full py-3 bg-[#F9F9F9] dark:bg-darkInput text-black dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Creating...' : 'Create Watchlist'}
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
