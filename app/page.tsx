'use client'

import './globals.css'
import Image from 'next/image'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser-client'
import { searchAnime } from '@/lib/anilist'
import NavigationBar from '../components/NavigationBar'
import Footer from '../components/Footer'
import CategorySection from '../components/CategorySection'
import DiscoverAnimeCard from '../components/DiscoverAnimeCard'

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
    const [user, setUser] = useState<User | null>(null)
    const [animeData, setAnimeData] = useState<AnimeCategories | null>(null)

    // Search state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Anime[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [isRestoringFromCache, setIsRestoringFromCache] = useState(false)

    // Restore search from URL params and sessionStorage on mount
    useEffect(() => {
        const urlQuery = searchParams.get('q')
        if (urlQuery && urlQuery.length >= 2) {
            setSearchQuery(urlQuery)

            // Try to restore from sessionStorage
            try {
                const cached = sessionStorage.getItem('discover_search_results')
                if (cached) {
                    const parsedResults = JSON.parse(cached)
                    setSearchResults(parsedResults)
                    setHasSearched(true)
                    setIsRestoringFromCache(true)
                }
            } catch (error) {
                console.error('Failed to restore search from cache:', error)
            }
        }
    }, [searchParams])

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
                console.log('Anime data:', data)
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
                sessionStorage.removeItem('discover_search_results')
                router.push('/', { scroll: false })
            }
            return
        }

        const debounceTimer = setTimeout(async () => {
            setIsSearching(true)
            setSearchError(null)

            try {
                const results = await searchAnime(searchQuery.trim())
                setSearchResults(results)
                setHasSearched(true)

                // Save to sessionStorage and update URL
                sessionStorage.setItem('discover_search_results', JSON.stringify(results))
                router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`, { scroll: false })
            } catch (error) {
                console.error('Search error:', error)
                setSearchError('Failed to search anime. Please try again.')
                setSearchResults([])
            } finally {
                setIsSearching(false)
            }
        }, 300) // 300ms debounce

        return () => clearTimeout(debounceTimer)
    }, [searchQuery, hasSearched, isRestoringFromCache, router])

    const handleClearSearch = () => {
        setSearchQuery('')
        setSearchResults([])
        setHasSearched(false)
        setSearchError(null)
        sessionStorage.removeItem('discover_search_results')
        router.push('/', { scroll: false })
    }

    return (
        <div className="bg-white">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
                <div className="max-w-5xl flex flex-col mx-auto gap-8">

                    {/* Banner */}
                    <section className="flex justify-center sm:px-10 mb-2">
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

                    {/* Search Bar */}
                    <section className="px-10">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-6 py-4 border border-gray-300 rounded-lg focus:outline-none focus:border-mySecondary transition-colors text-sm"
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

                    {/* Search Results or Categories */}
                    {hasSearched ? (
                        /* Search Results */
                        <section className="px-10 flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold uppercase tracking-tight">
                                    Search Results for "{searchQuery}"
                                </h2>
                                <button
                                    onClick={handleClearSearch}
                                    className="text-sm text-gray-600 hover:text-black underline transition-colors"
                                >
                                    Clear Search
                                </button>
                            </div>

                            {isSearching ? (
                                /* Loading State */
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="flex flex-col gap-2">
                                            <div className="w-full aspect-[309/455] bg-gray-200 animate-pulse rounded-md" />
                                            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                                            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : searchError ? (
                                /* Error State */
                                <div className="text-center py-16">
                                    <p className="text-red-600 mb-2">{searchError}</p>
                                    <button
                                        onClick={handleClearSearch}
                                        className="text-sm text-gray-600 hover:text-black underline"
                                    >
                                        Back to Browse
                                    </button>
                                </div>
                            ) : searchResults.length === 0 ? (
                                /* Empty State */
                                <div className="text-center py-16">
                                    <p className="text-gray-500 text-lg mb-2">No results found for "{searchQuery}"</p>
                                    <p className="text-gray-400 text-sm mb-4">Try a different search term</p>
                                    <button
                                        onClick={handleClearSearch}
                                        className="text-sm text-gray-600 hover:text-black underline"
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
                            <section className="px-10 flex flex-col gap-6 md:gap-12">
                                <CategorySection
                                    title="Most Popular"
                                    anime={animeData.mostPopular}
                                />

                                <hr className="border-t border-gray-200" />

                                <CategorySection
                                    title="Top Rated"
                                    anime={animeData.topRated}
                                />

                                <hr className="border-t border-gray-200" />

                                <CategorySection
                                    title="Shonen"
                                    anime={animeData.shonen}
                                />

                                <hr className="border-t border-gray-200" />

                                <CategorySection
                                    title="Slice of Life"
                                    anime={animeData.sliceOfLife}
                                />

                                <hr className="border-t border-gray-200" />

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
                <div className="text-gray-600">Loading...</div>
            </div>
        }>
            <DiscoverContent />
        </Suspense>
    );
}
