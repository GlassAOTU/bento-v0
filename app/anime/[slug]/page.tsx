'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import NavigationBar from '@/components/NavigationBar'
import Footer from '@/components/Footer'
import WatchlistModal from '@/components/WatchlistModal'
import AnimePageSkeleton, { DescriptionSkeleton } from '@/components/AnimePageSkeleton'
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
    const [aiDescription, setAiDescription] = useState<string | null>(null)
    const [descriptionLoading, setDescriptionLoading] = useState(false)
    const [activeTrailer, setActiveTrailer] = useState<string | null>(null)

    useEffect(() => {
        async function fetchAnimeData() {
            try {
                setLoading(true)
                setError(null)
                setAiDescription(null)

                // Fetch from API route
                const response = await fetch(`/api/anime/${resolvedParams.slug}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch anime data')
                }

                const data = await response.json()

                setAnimeDetails(data.details)
                setSimilarAnime(data.similar)
                setPopularAnime(data.popular)
                setLoading(false)

                // Check if AI description is already available
                if (data.aiDescription) {
                    setAiDescription(data.aiDescription)
                } else {
                    // Fetch AI description separately
                    fetchAIDescription(data.details.id, data.details.description, data.details, data.similar, data.popular)
                }
            } catch (err) {
                console.error('Error fetching anime:', err)
                setError('Failed to load anime details. The anime might not exist.')
                setLoading(false)
            }
        }

        async function fetchAIDescription(animeId: number, description: string, details: any, similar: any, popular: any) {
            try {
                setDescriptionLoading(true)

                const response = await fetch('/api/anime/description', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        animeId,
                        description,
                        details,
                        similar,
                        popular
                    }),
                })

                if (!response.ok) {
                    throw new Error('Failed to fetch AI description')
                }

                const data = await response.json()
                setAiDescription(data.description)
            } catch (err) {
                console.error('Error fetching AI description:', err)
                // Fallback to original description
                setAiDescription(description)
            } finally {
                setDescriptionLoading(false)
            }
        }

        fetchAnimeData()
    }, [resolvedParams.slug])

    if (loading) {
        return (
            <div className="bg-white min-h-screen">
                <NavigationBar />
                <AnimePageSkeleton />
                <Footer />
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
                <section className="relative w-full h-[300px] md:h-[400px] bg-gray-900">
                    {/* Banner Image */}
                    <div className="absolute inset-0">
                        <Image
                            src={animeDetails.bannerImage}
                            alt={animeDetails.title}
                            fill
                            className="object-contain"
                            priority
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>

                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="absolute top-6 left-6 md:left-10 z-20 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all backdrop-blur-sm"
                        aria-label="Go back"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                        </svg>
                    </button>

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
                    <section className="mb-8">
                        {descriptionLoading ? (
                            <DescriptionSkeleton />
                        ) : (
                            <p className="text-md leading-relaxed whitespace-pre-line">
                                {aiDescription || animeDetails.description}
                            </p>
                        )}
                    </section>

                    {/* Buttons Section */}
                    {(animeDetails.externalLinks || animeDetails.trailer) && (
                        <section className="mb-16">
                            <div className="flex gap-3">
                                {animeDetails.externalLinks && (
                                    <a href={animeDetails.externalLinks.url} target="_blank" rel="noopener noreferrer">
                                        <button className="px-4 py-2 rounded-md border border-mySecondary/50 hover:bg-mySecondary/10 hover:border-mySecondary transition-colors font-medium text-sm">
                                            {animeDetails.externalLinks.site}
                                        </button>
                                    </a>
                                )}

                                {animeDetails.trailer && animeDetails.trailer.id && (
                                    <button
                                        onClick={() => setActiveTrailer(animeDetails.trailer?.id || null)}
                                        className="px-4 py-2 rounded-md border border-mySecondary/50 hover:bg-mySecondary/10 hover:border-mySecondary transition-colors font-medium text-sm"
                                    >
                                        Watch Trailer
                                    </button>
                                )}
                            </div>
                        </section>
                    )}

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
