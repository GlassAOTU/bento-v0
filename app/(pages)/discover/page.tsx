'use client'

import '../../../app/globals.css'
import Image from 'next/image'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser-client'
import { searchAnimeEnhanced, AnimeFormat } from '@/lib/anilist-enhanced'
import NavigationBar from '../../../components/NavigationBar'
import Footer from '../../../components/Footer'
import CategorySection from '../../../components/CategorySection'
import DiscoverAnimeCard from '../../../components/DiscoverAnimeCard'
import { trackDiscoverSearch, trackDiscoverSearchCleared, trackDiscoverFormatFilter, getAuthStatus } from '@/lib/analytics/events'
import { useTheme } from '@/lib/theme/ThemeContext'

type FormatFilter = 'all' | 'tv' | 'movie'

const FORMAT_MAP: Record<FormatFilter, AnimeFormat[] | undefined> = {
    all: ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'],
    tv: ['TV', 'TV_SHORT'],
    movie: ['MOVIE']
}

const FORMAT_LABELS: Record<FormatFilter, string> = {
    all: 'All',
    tv: 'TV Show',
    movie: 'Movies'
}

type Anime = {
    id: number
    title: string
    image: string
    rating: number
}

type AnimeCategories = {
    mostPopular: Anime[]
    topRated: Anime[]
    shonen: Anime[]
    sliceOfLife: Anime[]
    foundFamily: Anime[]
}

function DiscoverContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { theme } = useTheme()
    const [user, setUser] = useState<User | null>(null)
    const [animeData, setAnimeData] = useState<AnimeCategories | null>(null)

    // Search state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Anime[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [isRestoringFromCache, setIsRestoringFromCache] = useState(false)

    // Format filter state (derived from URL, defaults to 'tv')
    const urlType = searchParams.get('type')
    const formatFilter: FormatFilter = (urlType === 'all' || urlType === 'tv' || urlType === 'movie') ? urlType : 'tv'

    // Restore search from URL params and sessionStorage on mount
    useEffect(() => {
        const urlQuery = searchParams.get('q')
        if (urlQuery && urlQuery.length >= 2) {
            setSearchQuery(urlQuery)

            // Try to restore from sessionStorage (cache key includes format)
            try {
                const cacheKey = `discover_search_${formatFilter}_results`
                const cached = sessionStorage.getItem(cacheKey)
                const cachedQuery = sessionStorage.getItem(`discover_search_${formatFilter}_query`)
                if (cached && cachedQuery === urlQuery) {
                    const parsedResults = JSON.parse(cached)
                    setSearchResults(parsedResults)
                    setHasSearched(true)
                    setIsRestoringFromCache(true)
                }
            } catch (error) {
                console.error('Failed to restore search from cache:', error)
            }
        }
    }, [searchParams, formatFilter])

    useEffect(() => {
        const initAuth = async () => {
            const supabase = await createClient()

            // Get initial session
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null)
            })

            return () => subscription.unsubscribe()
        }

        const loadAnimeData = async () => {
            try {
                const response = await fetch('/data/popular-anime.json')
                const data: AnimeCategories = await response.json()
                setAnimeData(data)
            } catch (error) {
                console.error('Failed to load anime data:', error)
            }
        }

        initAuth()
        loadAnimeData()
    }, [])

    // Debounced search handler
    useEffect(() => {
        // Skip if restoring from cache
        if (isRestoringFromCache) {
            setIsRestoringFromCache(false)
            return
        }

        if (searchQuery.trim().length < 2) {
            if (hasSearched) {
                // Clear search if query is too short
                setHasSearched(false)
                setSearchResults([])
                sessionStorage.removeItem(`discover_search_${formatFilter}_results`)
                sessionStorage.removeItem(`discover_search_${formatFilter}_query`)
                router.push('/discover', { scroll: false })
            }
            return
        }

        const debounceTimer = setTimeout(async () => {
            // Get the trimmed query
            const trimmedQuery = searchQuery.trim()

            // Check if this query+format was already searched (avoid duplicate searches)
            const cacheKey = `discover_search_${formatFilter}_results`
            const cacheQueryKey = `discover_search_${formatFilter}_query`
            const cachedResults = sessionStorage.getItem(cacheKey)
            const cachedQuery = sessionStorage.getItem(cacheQueryKey)

            if (cachedQuery === trimmedQuery && cachedResults) {
                // Already searched this exact query with same format, don't search again
                return
            }

            setIsSearching(true)
            setSearchError(null)

            try {
                const results = await searchAnimeEnhanced(trimmedQuery, 20, FORMAT_MAP[formatFilter])
                setSearchResults(results)
                setHasSearched(true)

                // Track search in PostHog (only on successful new search)
                trackDiscoverSearch({
                    query: trimmedQuery,
                    results_count: results.length,
                    auth_status: getAuthStatus(user)
                })

                // Save to sessionStorage and update URL
                sessionStorage.setItem(cacheKey, JSON.stringify(results))
                sessionStorage.setItem(cacheQueryKey, trimmedQuery)
                router.push(`/discover?q=${encodeURIComponent(trimmedQuery)}&type=${formatFilter}`, { scroll: false })
            } catch (error) {
                console.error('Search error:', error)
                setSearchError('Failed to search anime. Please try again.')
                setSearchResults([])
            } finally {
                setIsSearching(false)
            }
        }, 500) // Increased to 500ms debounce for better UX

        return () => clearTimeout(debounceTimer)
    }, [searchQuery, hasSearched, isRestoringFromCache, router, user, formatFilter])

    const handleClearSearch = () => {
        trackDiscoverSearchCleared()
        setSearchQuery('')
        setSearchResults([])
        setHasSearched(false)
        setSearchError(null)
        // Clear all format caches
        ;(['all', 'tv', 'movie'] as const).forEach(type => {
            sessionStorage.removeItem(`discover_search_${type}_results`)
            sessionStorage.removeItem(`discover_search_${type}_query`)
        })
        router.push('/discover', { scroll: false })
    }

    const handleFormatChange = (newFormat: FormatFilter) => {
        if (newFormat === formatFilter) return

        // Track format change
        trackDiscoverFormatFilter({
            format: newFormat,
            had_query: searchQuery.trim().length >= 2,
            auth_status: getAuthStatus(user)
        })

        // Update URL with new format
        const params = new URLSearchParams()
        if (searchQuery.trim().length >= 2) {
            params.set('q', searchQuery.trim())
        }
        params.set('type', newFormat)
        router.push(`/discover?${params.toString()}`, { scroll: false })
    }

    return (
        <div className="bg-white dark:bg-gray-900">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
                <div className="max-w-5xl flex flex-col mx-auto gap-8">

                    {/* Banner */}
                    <section className="flex justify-center sm:px-10 mb-2">
                        <div className="relative max-w-[1200px]">
                            <Image
                                src={theme === 'dark' ? "/images/banner-darkmode-2.png" : "/images/header-image-2.png"}
                                alt="Banner"
                                width={600}
                                height={300}
                                className="hidden sm:inline w-full h-auto"
                            />
                            <Image
                                src={theme === 'dark' ? "/images/banner-darkmode-2.png" : "/images/header-image-mobile.png"}
                                alt="Banner"
                                width={600}
                                height={300}
                                className="sm:hidden w-full h-auto"
                            />
                        </div>
                    </section>

                    {/* Search Bar */}
                    <section className="px-10">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-6 py-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:border-mySecondary transition-colors text-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 6 6 18" />
                                        <path d="m6 6 12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Format Filter Tabs - only show when searching */}
                    {hasSearched && (
                        <section className="px-10 -mt-4">
                            <div className="flex items-center gap-1 text-sm">
                                {(['all', 'tv', 'movie'] as const).map((type, index) => (
                                    <div key={type} className="flex items-center">
                                        {index > 0 && <span className="text-gray-300 dark:text-gray-600 mx-2">|</span>}
                                        <button
                                            onClick={() => handleFormatChange(type)}
                                            className={`transition-colors ${
                                                formatFilter === type
                                                    ? 'text-mySecondary dark:text-white font-medium'
                                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            {FORMAT_LABELS[type]}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Search Results or Categories */}
                    {hasSearched ? (
                        /* Search Results */
                        <section className="px-10 flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold uppercase tracking-tight dark:text-white">
                                    Search Results for "{searchQuery}"
                                </h2>
                                <button
                                    onClick={handleClearSearch}
                                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white underline transition-colors"
                                >
                                    Clear Search
                                </button>
                            </div>

                            {isSearching ? (
                                /* Loading State */
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="flex flex-col gap-2">
                                            <div className="w-full aspect-[309/455] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4" />
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : searchError ? (
                                /* Error State */
                                <div className="text-center py-16">
                                    <p className="text-red-600 dark:text-red-400 mb-2">{searchError}</p>
                                    <button
                                        onClick={handleClearSearch}
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white underline"
                                    >
                                        Back to Browse
                                    </button>
                                </div>
                            ) : searchResults.length === 0 ? (
                                /* Empty State */
                                <div className="text-center py-16">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No results found for "{searchQuery}"</p>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Try a different search term</p>
                                    <button
                                        onClick={handleClearSearch}
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white underline"
                                    >
                                        Back to Browse
                                    </button>
                                </div>
                            ) : (
                                /* Results Grid */
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {searchResults.map((anime) => (
                                        <DiscoverAnimeCard key={anime.id} anime={anime} />
                                    ))}
                                </div>
                            )}
                        </section>
                    ) : (
                        /* Categories */
                        animeData && (
                            <section className="px-10 flex flex-col gap-3 md:gap-6">
                                <CategorySection
                                    title="Most Popular"
                                    anime={animeData.mostPopular}
                                />

                                <hr className="border-t border-gray-200 dark:border-gray-700" />

                                <CategorySection
                                    title="Top Rated"
                                    anime={animeData.topRated}
                                />

                                <hr className="border-t border-gray-200 dark:border-gray-700" />

                                <CategorySection
                                    title="Shonen"
                                    anime={animeData.shonen}
                                />

                                <hr className="border-t border-gray-200 dark:border-gray-700" />

                                <CategorySection
                                    title="Slice of Life"
                                    anime={animeData.sliceOfLife}
                                />

                                <hr className="border-t border-gray-200 dark:border-gray-700" />

                                <CategorySection
                                    title="Found Family with No Incest Plotlines"
                                    anime={animeData.foundFamily}
                                />
                            </section>
                        )
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        }>
            <DiscoverContent />
        </Suspense>
    );
}
