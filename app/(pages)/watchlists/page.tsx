'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser-client'
import Image from 'next/image'
import NavigationBar from '@/components/NavigationBar'
import Footer from '@/components/Footer'
import ProfileHeader from '@/components/ProfileHeader'
import RecentSearchCard from '@/components/RecentSearchCard'
import EditWatchlistModal from '@/components/EditWatchlistModal'
import { slugify } from '@/lib/utils/slugify'
import { getRecentSearches, RecentSearch } from '@/lib/utils/localStorage'
import { useAuth } from '@/lib/auth/AuthContext'
import { useTheme } from '@/lib/theme/ThemeContext'
import {
    trackMyAnimePageViewed,
    trackWatchlistTabSwitched,
    trackWatchlistExpanded,
    trackWatchlistEdited
} from '@/lib/analytics/events'

interface WatchlistItem {
    id: string
    title: string
    reason: string
    description: string
    image: string
    image_source?: string | null
    tmdb_id?: number | null
    external_links: { url: string; site: string } | null
    trailer: { id: string; site: string } | null
}

interface Watchlist {
    id: string
    name: string
    description: string | null
    is_public: boolean
    slug: string
    items: WatchlistItem[]
}

// Update a watchlist item with TMDB image (runs in background)
async function updateItemWithTMDBImage(supabase: any, item: WatchlistItem) {
    try {
        // Fetch TMDB data
        const response = await fetch(`/api/anime/tmdb-lookup?title=${encodeURIComponent(item.title)}`)
        const tmdbData = await response.json()

        if (tmdbData.tmdb_id && tmdbData.poster_url) {
            // Update the item in the database
            await supabase
                .from('watchlist_items')
                .update({
                    image: tmdbData.poster_url,
                    tmdb_id: tmdbData.tmdb_id,
                    image_source: 'tmdb',
                    original_image_url: item.image
                })
                .eq('id', item.id)
        } else {
            // Mark as checked so we don't keep trying
            await supabase
                .from('watchlist_items')
                .update({
                    image_source: 'anilist_fallback'
                })
                .eq('id', item.id)
        }
    } catch (error) {
        console.error('Failed to update item with TMDB image:', error)
    }
}

function WatchlistsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [watchlists, setWatchlists] = useState<Watchlist[]>([])
    const [expandedWatchlists, setExpandedWatchlists] = useState<Set<string>>(new Set())
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
    const [activeTrailer, setActiveTrailer] = useState<string | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null)
    const [shareDropdownId, setShareDropdownId] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const { profile } = useAuth()
    const { theme } = useTheme()

    // Get active tab from URL params, default to 'watchlist'
    const activeTab = searchParams.get('tab') || 'watchlist'

    // Convert text to Title Case
    const toTitleCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1)
        }).join(' ')
    }

    useEffect(() => {
        checkAuthAndFetchWatchlists()
        // Load recent searches from localStorage
        const searches = getRecentSearches()
        console.log('Recent searches data:', searches)
        console.log('Number of recent searches:', searches.length)
        if (searches.length > 0) {
            console.log('First search example:', searches[0])
        }
        setRecentSearches(searches)

        // Listen for auth changes (sign out)
        let authSubscription: { unsubscribe: () => void } | null = null

        const initAuthListener = async () => {
            const supabase = createClient()
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT' || !session) {
                    // Redirect to home if user signs out
                    router.push('/')
                }
            })
            authSubscription = subscription
        }

        initAuthListener()

        // Cleanup subscription on unmount
        return () => {
            if (authSubscription) {
                authSubscription.unsubscribe()
            }
        }
    }, [router])

    const switchTab = (tab: 'watchlist' | 'recent-searches') => {
        // Track tab switch
        trackWatchlistTabSwitched({
            from_tab: activeTab as 'watchlist' | 'recent-searches',
            to_tab: tab
        })

        router.push(`/watchlists?tab=${tab}`)
    }

    const checkAuthAndFetchWatchlists = async () => {
        const supabase = createClient()

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            // Redirect to home if not authenticated
            router.push('/')
            return
        }

        // Fetch watchlists with their items
        try {
            const { data: watchlistsData, error: watchlistsError } = await supabase
                .from('watchlists')
                .select('id, name, description, is_public, slug')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (watchlistsError) {
                console.error('Error fetching watchlists:', watchlistsError)
                setLoading(false)
                return
            }

            // Fetch items for each watchlist
            const watchlistsWithItems = await Promise.all(
                (watchlistsData || []).map(async (watchlist) => {
                    const { data: itemsData, error: itemsError } = await supabase
                        .from('watchlist_items')
                        .select('*')
                        .eq('watchlist_id', watchlist.id)
                        .order('added_at', { ascending: false })

                    if (itemsError) {
                        console.error('Error fetching items:', itemsError)
                        return { ...watchlist, items: [] }
                    }

                    // Check for items without TMDB images and update them in background
                    const items = itemsData || []
                    for (const item of items) {
                        if (!item.image_source || item.image_source === 'external') {
                            updateItemWithTMDBImage(supabase, item)
                        }
                    }

                    return {
                        ...watchlist,
                        items: items
                    }
                })
            )

            setWatchlists(watchlistsWithItems)

            // Track My Anime page view
            const totalAnimeCount = watchlistsWithItems.reduce((sum, wl) => sum + wl.items.length, 0)
            trackMyAnimePageViewed({
                active_tab: activeTab as 'watchlist' | 'recent-searches',
                watchlist_count: watchlistsWithItems.length,
                total_anime_count: totalAnimeCount
            })
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleExpanded = (watchlistId: string) => {
        const watchlist = watchlists.find(wl => wl.id === watchlistId)
        const isCurrentlyExpanded = expandedWatchlists.has(watchlistId)

        if (watchlist) {
            trackWatchlistExpanded({
                watchlist_name: watchlist.name,
                watchlist_id: watchlistId,
                total_items: watchlist.items.length,
                action: isCurrentlyExpanded ? 'collapse' : 'expand'
            })
        }

        setExpandedWatchlists(prev => {
            const newSet = new Set(prev)
            if (newSet.has(watchlistId)) {
                newSet.delete(watchlistId)
            } else {
                newSet.add(watchlistId)
            }
            return newSet
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-900">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary dark:text-gray-200 pb-16 font-instrument-sans">
                <div className="max-w-5xl flex flex-col mx-auto gap-2">

                    {/* Banner */}
                    <section className="flex justify-center sm:px-10">
                        <div className="relative max-w-[1200px]">
                            <Image
                                src={theme === 'dark' ? "/images/banner-darkmode-1.png" : "/images/header-image.png"}
                                alt="Banner"
                                width={600}
                                height={300}
                                className="hidden sm:inline w-full h-auto"
                            />
                            <Image
                                src={theme === 'dark' ? "/images/banner-darkmode-1.png" : "/images/header-image-mobile.png"}
                                alt="Banner"
                                width={600}
                                height={300}
                                className="sm:hidden w-full h-auto"
                            />
                        </div>
                    </section>

                    {/* Page Content */}
                    <div className="px-10">
                        {/* Profile Header */}
                        <ProfileHeader />

                        {/* Tab Navigation */}
                        <div className="flex justify-center gap-0 mb-12">
                            <button
                                onClick={() => switchTab('watchlist')}
                                className={`flex-1 py-4 px-6 font-semibold transition-colors border border-gray-300 dark:border-gray-600 border-l-0 ${
                                    activeTab === 'watchlist'
                                        ? 'bg-[#F9F9F9] dark:bg-gray-800 text-black dark:text-white'
                                        : 'bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            >
                                my anime
                            </button>
                            <button
                                onClick={() => switchTab('recent-searches')}
                                className={`flex-1 py-4 px-6 font-semibold transition-colors border border-gray-300 dark:border-gray-600 border-l-0 border-r-0 ${
                                    activeTab === 'recent-searches'
                                        ? 'bg-[#F9F9F9] dark:bg-gray-800 text-black dark:text-white'
                                        : 'bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            >
                                recent searches
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'watchlist' ? (
                            /* My Anime Tab */
                            <div>
                                {/* Watchlists */}
                {watchlists.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">You don't have any watchlists yet.</p>
                        <p className="text-gray-400 dark:text-gray-500">Start adding anime to your watchlists from the recommendations page!</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {watchlists.map((watchlist) => {
                            const isExpanded = expandedWatchlists.has(watchlist.id)
                            const displayItems = isExpanded ? watchlist.items : watchlist.items.slice(0, 6)
                            const hasMore = watchlist.items.length > 6

                            return (
                                <div key={watchlist.id}>
                                    {/* Watchlist Title with Edit Button */}
                                    <div className="mb-6 flex items-start justify-between">
                                        <div>
                                            <h2 className="text-3xl font-bold">
                                                {watchlist.name}
                                            </h2>
                                            {watchlist.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{watchlist.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                {watchlist.is_public && profile ? (
                                                    <>
                                                        <button
                                                            onClick={() => setShareDropdownId(shareDropdownId === watchlist.id ? null : watchlist.id)}
                                                            className="px-6 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                        >
                                                            Share
                                                        </button>
                                                        {shareDropdownId === watchlist.id && (
                                                            <>
                                                                <div
                                                                    className="fixed inset-0 z-10"
                                                                    onClick={() => setShareDropdownId(null)}
                                                                />
                                                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                                                                    <button
                                                                        onClick={() => {
                                                                            const url = `${window.location.origin}/${profile.username}/${watchlist.slug}`
                                                                            navigator.clipboard.writeText(url)
                                                                            setCopiedId(watchlist.id)
                                                                            setTimeout(() => setCopiedId(null), 2000)
                                                                        }}
                                                                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                                        </svg>
                                                                        {copiedId === watchlist.id ? 'Copied!' : 'Copy link'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const url = `${window.location.origin}/${profile.username}/${watchlist.slug}`
                                                                            const text = 'Check out my anime watchlist!'
                                                                            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank')
                                                                            setShareDropdownId(null)
                                                                        }}
                                                                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                                                        </svg>
                                                                        Share on X
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        disabled
                                                        title="Make this watchlist public to share"
                                                        className="px-6 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                                    >
                                                        Share
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    trackWatchlistEdited({
                                                        watchlist_name: watchlist.name,
                                                        watchlist_id: watchlist.id
                                                    })
                                                    setEditingWatchlist(watchlist)
                                                    setIsEditModalOpen(true)
                                                }}
                                                className="px-6 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>

                                    {/* Anime Grid */}
                                    {watchlist.items.length === 0 ? (
                                        <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <p className="text-gray-400 dark:text-gray-500">This watchlist is empty</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                                                {displayItems.map((item) => (
                                                    <Link
                                                        key={item.id}
                                                        href={`/anime/${slugify(item.title)}`}
                                                        className="flex flex-col items-center group"
                                                    >
                                                        <div className="relative w-full max-w-[425px] aspect-square rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                                                            <Image
                                                                src={item.image || '/images/banner-not-available.png'}
                                                                alt={item.title}
                                                                width={425}
                                                                height={425}
                                                                className="object-cover w-full h-full"
                                                            />
                                                        </div>
                                                        <p className="mt-3 text-center font-medium text-sm tracking-wide group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                                            {toTitleCase(item.title)}
                                                        </p>
                                                    </Link>
                                                ))}
                                            </div>

                                            {/* See All Button */}
                                            {hasMore && (
                                                <div className="flex justify-center mt-8">
                                                    <button
                                                        onClick={() => toggleExpanded(watchlist.id)}
                                                        className="px-6 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                    >
                                                        {isExpanded ? 'Show Less' : 'See All'}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                            </div>
                        ) : (
                            /* Recent Searches Tab */
                            <div>
                                <h2 className="text-3xl font-bold mb-6">Recent Searches</h2>
                                {recentSearches.length === 0 ? (
                                    <div className="text-center py-16">
                                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">You haven't searched for anything yet.</p>
                                        <p className="text-gray-400 dark:text-gray-500">Try the recommendations page to discover new anime!</p>
                                    </div>
                                ) : (
                                    <div>
                                        {recentSearches.map((search, index) => (
                                            <RecentSearchCard
                                                key={index}
                                                search={search}
                                                onTrailerClick={(trailerId: string) => setActiveTrailer(trailerId)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />

            {/* Edit Watchlist Modal */}
            <EditWatchlistModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setEditingWatchlist(null)
                }}
                watchlist={editingWatchlist}
                onSave={() => {
                    checkAuthAndFetchWatchlists()
                }}
            />

            {/* Trailer Popup */}
            {activeTrailer && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setActiveTrailer(null);
                    }
                }}>
                    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-[90%] sm:max-w-[720px]">
                        <button
                            onClick={() => setActiveTrailer(null)}
                            className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-1 border border-mySecondary/50 dark:border-gray-600 hover:border-mySecondary"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </button>
                        <div className="relative w-full ph-no-capture" style={{ paddingTop: '56.25%' }}>
                            <iframe
                                className="absolute top-0 left-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${activeTrailer}`}
                                title="YouTube video player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function WatchlistsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        }>
            <WatchlistsContent />
        </Suspense>
    );
}
