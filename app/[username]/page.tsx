'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import NavigationBar from '@/components/NavigationBar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/browser-client'
import { slugify } from '@/lib/utils/slugify'

interface Profile {
    id: string
    user_id: string
    username: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    created_at: string
}

interface Stats {
    watchlist_count: number
    review_count: number
    following_count: number
    followers_count: number
}

interface Review {
    id: string
    anime_id: number
    anime_title: string
    anime_image: string
    rating: number
    review_text: string
    created_at: string
}

interface Watchlist {
    id: string
    name: string
    slug: string | null
    description: string | null
    item_count: number
    cover_image_url: string | null
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const resolvedParams = use(params)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [stats, setStats] = useState<Stats>({ watchlist_count: 0, review_count: 0, following_count: 0, followers_count: 0 })
    const [isFollowing, setIsFollowing] = useState(false)
    const [reviews, setReviews] = useState<Review[]>([])
    const [watchlists, setWatchlists] = useState<Watchlist[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState<'reviews' | 'watchlists'>('reviews')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [followLoading, setFollowLoading] = useState(false)

    const toTitleCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1)
        }).join(' ')
    }

    useEffect(() => {
        fetchProfileData()
        fetchCurrentUser()
    }, [resolvedParams.username])

    const fetchCurrentUser = async () => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)
        } catch {
            setCurrentUser(null)
        }
    }

    const fetchProfileData = async () => {
        try {
            setLoading(true)
            setError('')

            const profileResponse = await fetch(`/api/profile/${resolvedParams.username}`)
            const profileData = await profileResponse.json()

            if (!profileResponse.ok) {
                setError('Profile not found')
                setLoading(false)
                return
            }

            setProfile(profileData.profile)
            setStats(profileData.stats)
            setIsFollowing(profileData.isFollowing)

            const reviewsResponse = await fetch(`/api/reviews/user/${resolvedParams.username}?limit=10`)
            const reviewsData = await reviewsResponse.json()
            setReviews(reviewsData.reviews || [])

            const supabase = createClient()
            const { data: watchlistsData, error: watchlistsError } = await supabase
                .rpc('get_public_watchlists', { target_username: resolvedParams.username.toLowerCase() })

            if (!watchlistsError && watchlistsData) {
                const watchlistsWithCounts = await Promise.all(
                    watchlistsData.map(async (watchlist: any) => {
                        const { count } = await supabase
                            .from('watchlist_items')
                            .select('*', { count: 'exact', head: true })
                            .eq('watchlist_id', watchlist.id)

                        return {
                            ...watchlist,
                            item_count: count || 0
                        }
                    })
                )
                setWatchlists(watchlistsWithCounts)
            }

            setLoading(false)
        } catch (err) {
            console.error('Error fetching profile:', err)
            setError('Failed to load profile')
            setLoading(false)
        }
    }

    const handleFollow = async () => {
        if (!currentUser || !profile) return

        setFollowLoading(true)
        try {
            if (isFollowing) {
                const response = await fetch(`/api/follows/unfollow/${profile.user_id}`, {
                    method: 'DELETE'
                })

                if (response.ok) {
                    setIsFollowing(false)
                    setStats(prev => ({ ...prev, followers_count: prev.followers_count - 1 }))
                }
            } else {
                const response = await fetch('/api/follows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ following_id: profile.user_id })
                })

                if (response.ok) {
                    setIsFollowing(true)
                    setStats(prev => ({ ...prev, followers_count: prev.followers_count + 1 }))
                }
            }
        } catch (err) {
            console.error('Error following/unfollowing:', err)
        } finally {
            setFollowLoading(false)
        }
    }

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-5 h-5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                ))}
            </div>
        )
    }

    const getWatchlistSlug = (watchlist: Watchlist) => {
        return watchlist.slug || slugify(watchlist.name)
    }

    if (loading) {
        return (
            <div className="bg-white min-h-screen">
                <NavigationBar />
                <div className="max-w-5xl mx-auto px-10 py-16">
                    <div className="text-center text-gray-600">Loading profile...</div>
                </div>
                <Footer />
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="bg-white min-h-screen">
                <NavigationBar />
                <div className="max-w-5xl mx-auto px-10 py-16">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-4">Profile Not Found</h1>
                        <p className="text-gray-600 mb-6">{error || 'This profile does not exist'}</p>
                        <Link href="/" className="text-mySecondary hover:underline">
                            Go back home
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        )
    }

    const isOwnProfile = currentUser?.id === profile.user_id

    return (
        <div className="bg-white min-h-screen">
            <NavigationBar />

            <div className="max-w-5xl mx-auto px-10 py-16 font-instrument-sans">
                {/* Profile Header */}
                <div className="flex flex-col items-center mb-12">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        {profile.avatar_url ? (
                            <Image
                                src={profile.avatar_url}
                                alt={profile.username}
                                width={96}
                                height={96}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white text-3xl font-bold">
                                {profile.username.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* Username and Display Name */}
                    <h1 className="text-2xl font-bold mb-1">
                        {profile.display_name || profile.username}
                    </h1>
                    <p className="text-gray-500 mb-4">@{profile.username}</p>

                    {/* Bio */}
                    {profile.bio && (
                        <p className="text-center text-gray-700 max-w-2xl mb-6">{profile.bio}</p>
                    )}

                    {/* Follow Button */}
                    {!isOwnProfile && currentUser ? (
                        <button
                            onClick={handleFollow}
                            disabled={followLoading}
                            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                                isFollowing
                                    ? 'border border-gray-300 hover:bg-gray-50'
                                    : 'bg-black text-white hover:bg-gray-800'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                        </button>
                    ) : null}

                    {/* Stats */}
                    <div className="flex gap-8 mt-6 text-center">
                        <div>
                            <div className="text-2xl font-bold">{stats.watchlist_count}</div>
                            <div className="text-sm text-gray-500">watchlists</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stats.review_count}</div>
                            <div className="text-sm text-gray-500">reviews</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stats.following_count}</div>
                            <div className="text-sm text-gray-500">following</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stats.followers_count}</div>
                            <div className="text-sm text-gray-500">followers</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-0 mb-12 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`px-8 py-4 font-semibold transition-colors ${
                            activeTab === 'reviews'
                                ? 'border-b-2 border-black text-black'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Recent Reviews
                    </button>
                    <button
                        onClick={() => setActiveTab('watchlists')}
                        className={`px-8 py-4 font-semibold transition-colors ${
                            activeTab === 'watchlists'
                                ? 'border-b-2 border-black text-black'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Watchlists
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'reviews' ? (
                    <div>
                        {reviews.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-gray-500">No reviews yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {reviews.map((review) => (
                                    <Link
                                        key={review.id}
                                        href={`/anime/${slugify(review.anime_title)}`}
                                        className="flex gap-4 p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                    >
                                        {/* Anime Poster */}
                                        <div className="flex-shrink-0">
                                            <Image
                                                src={review.anime_image || '/images/banner-not-available.png'}
                                                alt={review.anime_title}
                                                width={100}
                                                height={150}
                                                className="rounded-md object-cover"
                                            />
                                        </div>

                                        {/* Review Content */}
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold mb-2">
                                                {toTitleCase(review.anime_title)}
                                            </h3>
                                            {renderStars(review.rating)}
                                            <p className="text-gray-700 mt-3 line-clamp-3">
                                                {review.review_text}
                                            </p>
                                            <p className="text-sm text-gray-400 mt-2">
                                                {new Date(review.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {watchlists.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-gray-500">No public watchlists yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {watchlists.map((watchlist) => (
                                    <Link
                                        key={watchlist.id}
                                        href={`/${profile.username}/${getWatchlistSlug(watchlist)}`}
                                        className="group block max-w-[634px]"
                                    >
                                        <div>
                                            <div className="relative w-full" style={{ aspectRatio: '634/280' }}>
                                                <Image
                                                    src={watchlist.cover_image_url || '/images/defaultwatchlistdisplay.png'}
                                                    alt={watchlist.name}
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                            <div
                                                className="bg-white rounded-b-[15px] py-4 px-4"
                                                style={{ boxShadow: '0 1.43px 1.43px rgba(0, 0, 0, 0.12)' }}
                                            >
                                                <h3 className="font-bold text-xl text-center">
                                                    {watchlist.name}
                                                </h3>
                                                <p className="text-gray-400 text-sm text-center mt-1">
                                                    {watchlist.item_count} anime
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    )
}
