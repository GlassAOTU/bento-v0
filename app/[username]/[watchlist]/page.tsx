'use client'

import { use, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import NavigationBar from '@/components/NavigationBar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/browser-client'
import { slugify } from '@/lib/utils/slugify'
import { trackPublicWatchlistViewed, getAuthStatus } from '@/lib/analytics/events'

interface WatchlistItem {
    id: string
    title: string
    image: string
    description: string | null
    reason: string | null
}

interface Watchlist {
    id: string
    user_id: string
    name: string
    slug: string | null
    description: string | null
    is_public: boolean
}

interface Profile {
    username: string
    display_name: string | null
    avatar_url: string | null
}

export default function WatchlistPage({ params }: { params: Promise<{ username: string; watchlist: string }> }) {
    const resolvedParams = use(params)
    const [watchlist, setWatchlist] = useState<Watchlist | null>(null)
    const [items, setItems] = useState<WatchlistItem[]>([])
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const hasTrackedView = useRef(false)

    const toTitleCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1)
        }).join(' ')
    }

    useEffect(() => {
        fetchWatchlistData()
        fetchCurrentUser()
    }, [resolvedParams.username, resolvedParams.watchlist])

    const fetchCurrentUser = async () => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)
        } catch {
            setCurrentUser(null)
        }
    }

    const fetchWatchlistData = async () => {
        try {
            setLoading(true)
            setError('')

            const response = await fetch(`/api/watchlists/user/${resolvedParams.username}/${resolvedParams.watchlist}`)
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Watchlist not found')
                setLoading(false)
                return
            }

            setWatchlist(data.watchlist)
            setItems(data.items || [])
            setProfile(data.profile)

            // Track watchlist view (only once)
            if (!hasTrackedView.current && data.watchlist && data.profile) {
                hasTrackedView.current = true
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                trackPublicWatchlistViewed({
                    watchlist_name: data.watchlist.name,
                    watchlist_id: data.watchlist.id,
                    owner_username: data.profile.username,
                    viewer_auth_status: getAuthStatus(user),
                    item_count: (data.items || []).length
                })
            }

            setLoading(false)
        } catch (err) {
            console.error('Error fetching watchlist:', err)
            setError('Failed to load watchlist')
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-white dark:bg-darkBg min-h-screen">
                <NavigationBar />
                <div className="max-w-7xl mx-auto px-10 py-16">
                    <div className="text-center text-gray-600 dark:text-gray-400">Loading watchlist...</div>
                </div>
                <Footer />
            </div>
        )
    }

    if (error || !watchlist || !profile) {
        return (
            <div className="bg-white dark:bg-darkBg min-h-screen">
                <NavigationBar />
                <div className="max-w-7xl mx-auto px-10 py-16">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-4 dark:text-white">Watchlist Not Found</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'This watchlist does not exist or is private'}</p>
                        <Link href={`/${resolvedParams.username}`} className="text-mySecondary dark:text-white hover:underline">
                            Go to profile
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        )
    }

    const isOwner = currentUser?.id === watchlist.user_id

    return (
        <div className="bg-white dark:bg-darkBg min-h-screen">
            <NavigationBar />

            <div className="max-w-7xl mx-auto px-10 py-16 font-instrument-sans">
                {/* Breadcrumb */}
                <div className="mb-8">
                    <Link
                        href={`/${profile.username}`}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        @{profile.username}
                    </Link>
                    <span className="text-gray-400 dark:text-gray-600 mx-2">/</span>
                    <span className="text-gray-900 dark:text-white">{watchlist.name}</span>
                </div>

                {/* Watchlist Header */}
                <div className="mb-12">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2 dark:text-white">{watchlist.name}</h1>
                            {watchlist.description && (
                                <p className="text-gray-600 dark:text-gray-400 text-lg">{watchlist.description}</p>
                            )}
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                                {items.length} {items.length === 1 ? 'anime' : 'anime'}
                            </p>
                        </div>
                        {isOwner && (
                            <Link
                                href="/watchlists"
                                className="px-6 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                            >
                                Edit
                            </Link>
                        )}
                    </div>
                </div>

                {/* Watchlist Items */}
                {items.length === 0 ? (
                    <div className="text-center py-16 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">This watchlist is empty</p>
                        {isOwner && (
                            <p className="text-gray-400 dark:text-gray-500">Add anime from the discover page!</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {items.map((item) => (
                            <Link
                                key={item.id}
                                href={`/anime/${slugify(item.title)}`}
                                className="flex flex-col items-center group"
                            >
                                <div className="relative w-full aspect-[309/455] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                                    <Image
                                        src={item.image || '/images/banner-not-available.png'}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <p className="mt-3 text-center font-medium text-sm tracking-wide dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                    {toTitleCase(item.title)}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    )
}
