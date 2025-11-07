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
    external_links: { url: string; site: string } | null
    trailer: { id: string; site: string } | null
}

interface Watchlist {
    id: string
    name: string
    description: string | null
    items: WatchlistItem[]
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
                .select('id, name, description')
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

                    return {
                        ...watchlist,
                        items: itemsData || []
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
                <div className="text-gray-600">Loading...</div>
            </div>
        )
    }

    return (
        <div className="bg-white">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
                <div className="max-w-5xl flex flex-col mx-auto gap-2">

                    {/* Banner */}
                    <section className="flex justify-center sm:px-10">
                        <div className="relative max-w-[1200px]">
                            <Image
                                src="/images/header-image.png"
                                alt="Banner"
                                width={600}
                                height={300}
                                className="hidden sm:inline w-full h-auto"
                            />
                            <Image
                                src="/images/header-image-mobile.png"
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
                                className={`flex-1 py-4 px-6 font-semibold transition-colors border border-gray-300 border-l-0 ${
                                    activeTab === 'watchlist'
                                        ? 'bg-[#F9F9F9] text-black'
                                        : 'bg-white text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                my anime
                            </button>
                            <button
                                onClick={() => switchTab('recent-searches')}
                                className={`flex-1 py-4 px-6 font-semibold transition-colors border border-gray-300 border-l-0 border-r-0 ${
                                    activeTab === 'recent-searches'
                                        ? 'bg-[#F9F9F9] text-black'
                                        : 'bg-white text-gray-400 hover:text-gray-600'
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
                        <p className="text-gray-500 text-lg mb-4">You don't have any watchlists yet.</p>
                        <p className="text-gray-400">Start adding anime to your watchlists from the recommendations page!</p>
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
                                                <p className="text-sm text-gray-500 mt-1">{watchlist.description}</p>
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
                                            className="px-6 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    {/* Anime Grid */}
                                    {watchlist.items.length === 0 ? (
                                        <div className="text-center py-8 border border-gray-200 rounded-lg">
                                            <p className="text-gray-400">This watchlist is empty</p>
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
                                                        <p className="mt-3 text-center font-medium text-sm tracking-wide group-hover:text-gray-700 transition-colors">
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
                                                        className="px-6 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
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
                                        <p className="text-gray-500 text-lg mb-4">You haven't searched for anything yet.</p>
                                        <p className="text-gray-400">Try the recommendations page to discover new anime!</p>
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
                    <div className="relative bg-white p-6 rounded-lg w-full max-w-[90%] sm:max-w-[720px]">
                        <button
                            onClick={() => setActiveTrailer(null)}
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 border border-mySecondary/50 hover:border-mySecondary"
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
                <div className="text-gray-600">Loading...</div>
            </div>
        }>
            <WatchlistsContent />
        </Suspense>
    );
}
