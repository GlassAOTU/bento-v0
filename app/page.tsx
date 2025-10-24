'use client'

import './globals.css'
import Image from 'next/image'
import { useEffect, useState } from 'react'
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
    shonen: Anime[]
    isekai: Anime[]
    foundFamily: Anime[]
}

export default function Home() {
    const [user, setUser] = useState<User | null>(null)
    const [animeData, setAnimeData] = useState<AnimeCategories | null>(null)

    // Search state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Anime[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)

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
        if (searchQuery.trim().length < 2) {
            if (hasSearched) {
                // Clear search if query is too short
                setHasSearched(false)
                setSearchResults([])
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
            } catch (error) {
                console.error('Search error:', error)
                setSearchError('Failed to search anime. Please try again.')
                setSearchResults([])
            } finally {
                setIsSearching(false)
            }
        }, 300) // 300ms debounce

        return () => clearTimeout(debounceTimer)
    }, [searchQuery, hasSearched])

    const handleClearSearch = () => {
        setSearchQuery('')
        setSearchResults([])
        setHasSearched(false)
        setSearchError(null)
    }

    return (
        <div className="bg-white">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
                <div className="max-w-5xl flex flex-col mx-auto gap-8">

                    {/* Banner */}
                    <section className="flex justify-center sm:px-10 md:mb-10">
                        <div className="relative max-w-[1200px]">
                            <Image
                                src="/images/header-image.png"
                                alt="Banner"
                                width={600}
                                height={300}
                                className="hidden sm:inline w-full h-auto [mask-image:linear-gradient(to_top,transparent_0%,black_10%)]"
                            />
                            <Image
                                src="/images/header-image-mobile.png"
                                alt="Banner"
                                width={600}
                                height={300}
                                className="sm:hidden w-full h-auto [mask-image:linear-gradient(to_top,transparent_0%,black_10%)]"
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
                            <section className="px-10 flex flex-col gap-12">
                                <CategorySection
                                    title="MOST POPULAR"
                                    anime={animeData.mostPopular}
                                />
                                <CategorySection
                                    title="SHONEN"
                                    anime={animeData.shonen}
                                />
                                <CategorySection
                                    title="ISEKAI (SLICE OF LIFE)"
                                    anime={animeData.isekai}
                                />
                                <CategorySection
                                    title="FOUND FAMILY WITH NO INCEST PLOTLINES"
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
