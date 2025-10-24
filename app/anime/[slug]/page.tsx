'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import NavigationBar from '@/components/NavigationBar'
import Footer from '@/components/Footer'
import WatchlistModal from '@/components/WatchlistModal'
import { slugify } from '@/lib/utils/slugify'

interface AnimeDetails {
    id: number
    title: string
    englishTitle: string | null
    bannerImage: string
    coverImage: string
    description: string
    episodes: number | null
    status: string
    aired: string
    premiered: string | null
    studios: string
    genres: string[]
    duration: string | null
    rating: number | null
    trailer: { id: string; site: string } | null
    externalLinks: { url: string; site: string } | null
}

interface AnimeCard {
    id: number
    title: string
    image: string
    rating: number | null
}

export default function AnimePage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = use(params)
    const router = useRouter()
    const [animeDetails, setAnimeDetails] = useState<AnimeDetails | null>(null)
    const [similarAnime, setSimilarAnime] = useState<AnimeCard[]>([])
    const [popularAnime, setPopularAnime] = useState<AnimeCard[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false)

    useEffect(() => {
        async function fetchAnimeData() {
            try {
                setLoading(true)
                setError(null)

                // Fetch from API route
                const response = await fetch(`/api/anime/${resolvedParams.slug}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch anime data')
                }

                const data = await response.json()

                setAnimeDetails(data.details)
                setSimilarAnime(data.similar)
                setPopularAnime(data.popular)
            } catch (err) {
                console.error('Error fetching anime:', err)
                setError('Failed to load anime details. The anime might not exist.')
            } finally {
                setLoading(false)
            }
        }

        fetchAnimeData()
    }, [resolvedParams.slug])

    if (loading) {
        return (
            <div className="bg-white min-h-screen">
                <NavigationBar />
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-gray-600">Loading anime details...</div>
                </div>
            </div>
        )
    }

    if (error || !animeDetails) {
        return (
            <div className="bg-white min-h-screen">
                <NavigationBar />
                <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Anime Not Found</h1>
                    <p className="text-gray-600 mb-6">{error || 'The anime you\'re looking for doesn\'t exist.'}</p>
                    <button
                        onClick={() => router.push('/recommendation')}
                        className="px-6 py-3 bg-mySecondary text-white rounded-md hover:bg-[#2b2b2b] transition-colors"
                    >
                        Back to Recommendations
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
                {/* Hero Section with Banner */}
                <section className="relative w-full h-[400px] md:h-[500px]">
                    {/* Banner Image */}
                    <div className="absolute inset-0">
                        <Image
                            src={animeDetails.bannerImage}
                            alt={animeDetails.title}
                            fill
                            className="object-cover"
                            priority
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>

                    {/* Hero Content */}
                    <div className="relative z-10 h-full flex items-end">
                        <div className="max-w-5xl mx-auto w-full px-10 pb-12">
                            <button
                                onClick={() => setIsWatchlistModalOpen(true)}
                                className="px-6 py-2 mb-4 bg-white/90 hover:bg-white text-black font-semibold rounded-md transition-colors inline-block"
                            >
                                ADD TO WATCHLIST
                            </button>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                                {animeDetails.title}
                            </h1>
                            {animeDetails.englishTitle && animeDetails.englishTitle !== animeDetails.title && (
                                <p className="text-xl text-white/90">{animeDetails.englishTitle}</p>
                            )}
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-10 py-12">
                    {/* Description Section */}
                    <section className="mb-16">
                        <p className="text-md leading-relaxed whitespace-pre-line">
                            {animeDetails.description}
                        </p>
                    </section>

                    {/* Details Section */}
                    <section className="mb-16">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Details</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {animeDetails.episodes && (
                                <div className="flex">
                                    <span className="font-semibold min-w-[140px]">Episodes</span>
                                    <span>{animeDetails.episodes}</span>
                                </div>
                            )}
                            <div className="flex">
                                <span className="font-semibold min-w-[140px]">Status</span>
                                <span>{animeDetails.status}</span>
                            </div>
                            <div className="flex">
                                <span className="font-semibold min-w-[140px]">Aired</span>
                                <span>{animeDetails.aired}</span>
                            </div>
                            {animeDetails.premiered && (
                                <div className="flex">
                                    <span className="font-semibold min-w-[140px]">Premiered</span>
                                    <span>{animeDetails.premiered}</span>
                                </div>
                            )}
                            {animeDetails.studios && (
                                <div className="flex">
                                    <span className="font-semibold min-w-[140px]">Studio</span>
                                    <span>{animeDetails.studios}</span>
                                </div>
                            )}
                            {animeDetails.genres && animeDetails.genres.length > 0 && (
                                <div className="flex">
                                    <span className="font-semibold min-w-[140px]">Genre</span>
                                    <span>{animeDetails.genres.join(", ")}</span>
                                </div>
                            )}
                            {animeDetails.duration && (
                                <div className="flex">
                                    <span className="font-semibold min-w-[140px]">Duration</span>
                                    <span>{animeDetails.duration}</span>
                                </div>
                            )}
                            {animeDetails.rating && (
                                <div className="flex">
                                    <span className="font-semibold min-w-[140px]">Rating</span>
                                    <span>{animeDetails.rating}/100</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Similar Anime Section */}
                    {similarAnime.length > 0 && (
                        <section className="mb-16">
                            <h2 className="text-2xl font-bold mb-6">Similar Anime You Might Enjoy</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {similarAnime.map((anime) => (
                                    <Link
                                        key={anime.id}
                                        href={`/anime/${slugify(anime.title)}`}
                                        className="flex flex-col group"
                                    >
                                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                                            <Image
                                                src={anime.image}
                                                alt={anime.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <p className="mt-3 font-medium text-sm line-clamp-2">{anime.title}</p>
                                        {anime.rating && (
                                            <p className="text-xs text-gray-500">★ {anime.rating}/100</p>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Most Popular Section */}
                    {popularAnime.length > 0 && (
                        <section className="mb-16">
                            <h2 className="text-2xl font-bold mb-6">Most Popular</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {popularAnime.map((anime) => (
                                    <Link
                                        key={anime.id}
                                        href={`/anime/${slugify(anime.title)}`}
                                        className="flex flex-col group"
                                    >
                                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                                            <Image
                                                src={anime.image}
                                                alt={anime.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <p className="mt-3 font-medium text-sm line-clamp-2">{anime.title}</p>
                                        {anime.rating && (
                                            <p className="text-xs text-gray-500">★ {anime.rating}/100</p>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <Footer />

            {/* Watchlist Modal */}
            <WatchlistModal
                isOpen={isWatchlistModalOpen}
                onClose={() => setIsWatchlistModalOpen(false)}
                anime={{
                    title: animeDetails.title,
                    reason: "Added from anime detail page",
                    description: animeDetails.description,
                    image: animeDetails.coverImage,
                    externalLinks: animeDetails.externalLinks,
                    trailer: animeDetails.trailer
                }}
            />
        </div>
    )
}
