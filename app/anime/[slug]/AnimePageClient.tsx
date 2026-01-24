'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import NavigationBar from '@/components/NavigationBar'
import Footer from '@/components/Footer'
import WatchlistModal from '@/components/WatchlistModal'
import RecentEpisodes from '@/components/RecentEpisodes'
import VideosSection from '@/components/VideosSection'
import AnimeSection from '@/components/anime/AnimeSection'
import ExpandableDescription from '@/components/anime/ExpandableDescription'
import ReviewsSection from '@/components/anime/ReviewsSection'
import AnimePageSkeleton from '@/components/AnimePageSkeleton'
import { StreamingButton } from '@/components/StreamingButton'
import DiscoverAnimeCard from '@/components/DiscoverAnimeCard'
import { slugify } from '@/lib/utils/slugify'
import {
    trackAnimeDetailViewed,
    trackAnimeExternalLinkClicked,
    trackWatchlistAddClicked,
    trackAnimeCarouselScroll,
    trackAnimeVideoPlayed,
    trackAIDescriptionRequested,
    trackAIDescriptionCompleted,
    trackAIDescriptionFailed,
    getReferrerPage,
    getAuthStatus
} from '@/lib/analytics/events'
import { useAuth } from '@/lib/auth/AuthContext'

interface AnimeDetails {
    id: number
    title: string
    romajiTitle: string | null
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
    streamingLinks?: { url: string; site: string }[]
}

interface AnimeCard {
    id: number
    title: string
    image: string
    rating: number | null
}

interface AnimePageClientProps {
    slug: string
}

export default function AnimePageClient({ slug }: AnimePageClientProps) {
    const router = useRouter()
    const { user } = useAuth()
    const [animeDetails, setAnimeDetails] = useState<AnimeDetails | null>(null)
    const [similarAnime, setSimilarAnime] = useState<AnimeCard[]>([])
    const [popularAnime, setPopularAnime] = useState<AnimeCard[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false)
    const [aiDescription, setAiDescription] = useState<string | null>(null)
    const [descriptionLoading, setDescriptionLoading] = useState(false)
    const [activeTrailer, setActiveTrailer] = useState<string | null>(null)
    const [seasons, setSeasons] = useState<any[]>([])
    const [latestSeasonEpisodes, setLatestSeasonEpisodes] = useState<any>(null)
    const [tmdbId, setTmdbId] = useState<number | null>(null)
    const [videos, setVideos] = useState<any[]>([])
    const similarScrollRef = useRef<HTMLDivElement>(null)
    const popularScrollRef = useRef<HTMLDivElement>(null)
    const [mostPopularAnime, setMostPopularAnime] = useState<AnimeCard[]>([])

    const scrollSimilar = (direction: 'left' | 'right') => {
        const container = similarScrollRef.current
        if (!container) return

        const scrollAmount = container.clientWidth * 0.8
        const targetScroll = direction === 'left'
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        })

        if (animeDetails) {
            trackAnimeCarouselScroll({
                anime_title: animeDetails.title,
                carousel_type: 'similar',
                direction
            })
        }
    }

    const scrollPopular = (direction: 'left' | 'right') => {
        const container = popularScrollRef.current
        if (!container) return

        const scrollAmount = container.clientWidth * 0.8
        const targetScroll = direction === 'left'
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        })

        if (animeDetails) {
            trackAnimeCarouselScroll({
                anime_title: animeDetails.title,
                carousel_type: 'most_popular',
                direction
            })
        }
    }

    const handleVideoClick = (videoKey: string, videoType: string) => {
        setActiveTrailer(videoKey)
        if (animeDetails) {
            const type = videoType.toLowerCase().includes('trailer') ? 'trailer'
                : videoType.toLowerCase().includes('pv') ? 'pv'
                : 'other'
            trackAnimeVideoPlayed({
                anime_title: animeDetails.title,
                video_type: type
            })
        }
    }

    useEffect(() => {
        fetch('/data/popular-anime.json')
            .then(res => res.json())
            .then(data => setMostPopularAnime(data.mostPopular || []))
            .catch(err => console.error('Failed to load popular anime:', err))
    }, [])

    useEffect(() => {
        async function fetchAnimeData() {
            try {
                setLoading(true)
                setError(null)
                setAiDescription(null)

                const response = await fetch(`/api/anime/${slug}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch anime data')
                }

                const data = await response.json()

                setAnimeDetails(data.details)
                setSimilarAnime(data.similar)
                setPopularAnime(data.popular)
                setSeasons(data.seasons || [])
                setLatestSeasonEpisodes(data.latestSeasonEpisodes || null)
                setTmdbId(data.tmdbId || null)
                setVideos(data.videos || [])
                setLoading(false)

                trackAnimeDetailViewed({
                    anime_id: data.details.id,
                    anime_title: data.details.title,
                    referrer_page: getReferrerPage(),
                    auth_status: getAuthStatus(user)
                })

                if (data.aiDescription) {
                    setAiDescription(data.aiDescription)
                } else {
                    fetchAIDescription(data.details.id, data.details.description, data.details, data.similar, data.popular, data.details.title)
                }

                if (process.env.NODE_ENV === 'development') {
                    fetchTMDBComparison(slug, data.details)
                }
            } catch (err) {
                console.error('Error fetching anime:', err)
                setError('Failed to load anime details. The anime might not exist.')
                setLoading(false)
            }
        }

        async function fetchTMDBComparison(slug: string, anilistDetails: any) {
            try {
                const response = await fetch(`/api/anime/tmdb-compare/${slug}`)
                if (!response.ok) {
                    console.warn('TMDB comparison failed:', response.status)
                    return
                }
                const comparison = await response.json()
                console.groupEnd()
            } catch (error) {
            }
        }

        async function fetchAIDescription(animeId: number, description: string, details: any, similar: any, popular: any, animeTitle: string) {
            const startTime = Date.now()
            try {
                setDescriptionLoading(true)

                trackAIDescriptionRequested({
                    anime_id: animeId,
                    anime_title: animeTitle
                })

                const response = await fetch('/api/anime/description', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ animeId, description, details, similar, popular })
                })

                if (response.ok) {
                    const data = await response.json()
                    setAiDescription(data.description)

                    trackAIDescriptionCompleted({
                        anime_id: animeId,
                        anime_title: animeTitle,
                        from_cache: data.fromCache || false,
                        fallback: data.fallback || false,
                        response_time_ms: Date.now() - startTime
                    })
                } else {
                    setAiDescription(description)
                    trackAIDescriptionFailed({
                        anime_id: animeId,
                        anime_title: animeTitle,
                        error: `HTTP ${response.status}`
                    })
                }
            } catch (err) {
                console.error('Error fetching AI description:', err)
                setAiDescription(description)
                trackAIDescriptionFailed({
                    anime_id: animeId,
                    anime_title: animeTitle,
                    error: err instanceof Error ? err.message : 'Unknown error'
                })
            } finally {
                setDescriptionLoading(false)
            }
        }

        fetchAnimeData()
    }, [slug, user])

    if (loading) {
        return (
            <div className="bg-white dark:bg-darkBg min-h-screen">
                <NavigationBar />
                <AnimePageSkeleton />
                <Footer />
            </div>
        )
    }

    if (error || !animeDetails) {
        return (
            <div className="bg-white dark:bg-darkBg min-h-screen">
                <NavigationBar />
                <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Anime Not Found</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'The anime you\'re looking for doesn\'t exist.'}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-mySecondary text-white rounded-md hover:bg-[#2b2b2b] transition-colors"
                    >
                        Back to Recommendations
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-darkBg">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
                {/* Hero Section with Banner - Full Width */}
                <section className="relative w-full h-[546px] bg-gray-900">
                    {/* Banner Image - Full Width */}
                    <div className="absolute inset-0 w-full">
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

                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="absolute top-6 left-6 md:left-16 z-20 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all backdrop-blur-sm"
                        aria-label="Go back"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Hero Content */}
                    <div className="relative z-10 h-full flex items-end">
                        <div className="container mx-auto max-w-7xl px-6 md:px-16 pb-12">
                            <button
                                onClick={() => {
                                    trackWatchlistAddClicked({
                                        anime_title: animeDetails.title,
                                        source_page: 'anime_detail',
                                        auth_status: getAuthStatus(user)
                                    })
                                    setIsWatchlistModalOpen(true)
                                }}
                                className="px-6 py-2 mb-4 bg-white/90 hover:bg-white dark:bg-darkInput/90 dark:hover:bg-gray-800 text-black dark:text-white font-semibold rounded-md transition-colors inline-block dark:border dark:border-white/40"
                            >
                                ADD TO WATCHLIST
                            </button>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <h1 className="text-4xl md:text-5xl font-bold text-white">
                                    {animeDetails.title}
                                </h1>
                                {animeDetails.streamingLinks && animeDetails.streamingLinks.length > 0 && (
                                    <div className="flex gap-2 flex-wrap mt-2 md:mt-0">
                                        {animeDetails.streamingLinks.map((link, index) => (
                                            <StreamingButton
                                                key={index}
                                                platform={link.site}
                                                url={link.url}
                                                onTrack={() => {
                                                    trackAnimeExternalLinkClicked({
                                                        anime_title: animeDetails.title,
                                                        platform: link.site
                                                    })
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Description Section */}
                <AnimeSection divider>
                    <ExpandableDescription
                        description={aiDescription || animeDetails.description}
                        loading={descriptionLoading}
                    />
                </AnimeSection>

                {/* Reviews Section */}
                <AnimeSection divider={seasons?.filter(s => s.season_number > 0).length > 0 || (videos && videos.length > 0)} noPaddingTop>
                    <ReviewsSection
                        animeId={animeDetails.id}
                        animeTitle={animeDetails.title}
                        animeImage={animeDetails.coverImage}
                        animeBannerImage={animeDetails.bannerImage}
                    />
                </AnimeSection>

                {/* Recent Episodes Section */}
                {seasons && seasons.filter(s => s.season_number > 0).length > 0 && (
                    <AnimeSection divider={videos && videos.length > 0} noPaddingTop>
                        <RecentEpisodes
                            seasons={seasons}
                            latestSeasonEpisodes={latestSeasonEpisodes}
                            animeSlug={slug}
                            onSeasonChange={async (seasonNumber: number) => {
                                if (!tmdbId) return []
                                const response = await fetch(`/api/anime/tmdb/season/${tmdbId}/${seasonNumber}`)
                                if (!response.ok) return []
                                const data = await response.json()
                                return data.episodes || []
                            }}
                        />
                    </AnimeSection>
                )}

                {/* Videos Section */}
                {videos && videos.length > 0 && (
                    <AnimeSection divider noPaddingTop>
                        <VideosSection
                            videos={videos}
                            onVideoClick={(videoKey, videoType) => handleVideoClick(videoKey, videoType || 'other')}
                        />
                    </AnimeSection>
                )}

                {/* Details Section */}
                <AnimeSection title="Details" divider={similarAnime.length > 0} noPaddingTop>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {animeDetails.episodes && (
                            <div className="flex">
                                <span className="font-semibold min-w-[140px] dark:text-white">Episodes</span>
                                <span className="dark:text-gray-300">{animeDetails.episodes}</span>
                            </div>
                        )}
                        <div className="flex">
                            <span className="font-semibold min-w-[140px] dark:text-white">Status</span>
                            <span className="dark:text-gray-300">{animeDetails.status}</span>
                        </div>
                        <div className="flex">
                            <span className="font-semibold min-w-[140px] dark:text-white">Aired</span>
                            <span className="dark:text-gray-300">{animeDetails.aired}</span>
                        </div>
                        {animeDetails.premiered && (
                            <div className="flex">
                                <span className="font-semibold min-w-[140px] dark:text-white">Premiered</span>
                                <span className="dark:text-gray-300">{animeDetails.premiered}</span>
                            </div>
                        )}
                        {animeDetails.studios && (
                            <div className="flex">
                                <span className="font-semibold min-w-[140px] dark:text-white">Studio</span>
                                <span className="dark:text-gray-300">{animeDetails.studios}</span>
                            </div>
                        )}
                        {animeDetails.genres && animeDetails.genres.length > 0 && (
                            <div className="flex">
                                <span className="font-semibold min-w-[140px] dark:text-white">Genre</span>
                                <span className="dark:text-gray-300">{animeDetails.genres.join(", ")}</span>
                            </div>
                        )}
                        {animeDetails.duration && (
                            <div className="flex">
                                <span className="font-semibold min-w-[140px] dark:text-white">Duration</span>
                                <span className="dark:text-gray-300">{animeDetails.duration}</span>
                            </div>
                        )}
                        {animeDetails.rating && (
                            <div className="flex">
                                <span className="font-semibold min-w-[140px] dark:text-white">Rating</span>
                                <span className="dark:text-gray-300">{animeDetails.rating}/100</span>
                            </div>
                        )}
                    </div>
                </AnimeSection>

                {/* Similar Anime Section */}
                {similarAnime.length > 0 && (
                    <AnimeSection divider={mostPopularAnime.length > 0} noPaddingTop>
                        <div>
                            <h2 className="text-2xl font-bold mb-6 dark:text-white">Similar Anime You Might Enjoy</h2>
                            <div className="flex items-center gap-2 md:gap-4">
                                {/* Left Arrow - External */}
                                <button
                                    onClick={() => scrollSimilar('left')}
                                    className="hidden md:flex flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-darkInput border border-gray-300 dark:border-gray-600 items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transition-all text-black dark:text-white"
                                    aria-label="Scroll left"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6"/>
                                    </svg>
                                </button>

                                <div className="relative flex-1 min-w-0">
                                    {/* Mobile fade overlay */}
                                    <div className="md:hidden absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10" />

                                    {/* Scrollable Container */}
                                    <div
                                        ref={similarScrollRef}
                                        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                                        style={{
                                            scrollbarWidth: 'none',
                                            msOverflowStyle: 'none',
                                        }}
                                    >
                                        {similarAnime.map((anime, index) => (
                                            <div
                                                key={anime.id}
                                                className="flex-none w-[45%] md:w-[calc(25%-0.75rem)] snap-start"
                                            >
                                                <DiscoverAnimeCard
                                                    anime={{ ...anime, rating: anime.rating ?? 0 }}
                                                    category="similar"
                                                    positionInCarousel={index}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Arrow - External */}
                                <button
                                    onClick={() => scrollSimilar('right')}
                                    className="hidden md:flex flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-darkInput border border-gray-300 dark:border-gray-600 items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transition-all text-black dark:text-white"
                                    aria-label="Scroll right"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </AnimeSection>
                )}

                {/* Most Popular Section */}
                {mostPopularAnime.length > 0 && (
                    <AnimeSection noPaddingTop>
                        <div>
                            <h2 className="text-2xl font-bold mb-6 dark:text-white">Most Popular</h2>
                            <div className="flex items-center gap-2 md:gap-4">
                                {/* Left Arrow - External */}
                                <button
                                    onClick={() => scrollPopular('left')}
                                    className="hidden md:flex flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-darkInput border border-gray-300 dark:border-gray-600 items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transition-all text-black dark:text-white"
                                    aria-label="Scroll left"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6"/>
                                    </svg>
                                </button>

                                <div className="relative flex-1 min-w-0">
                                    {/* Mobile fade overlay */}
                                    <div className="md:hidden absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10" />

                                    {/* Scrollable Container */}
                                    <div
                                        ref={popularScrollRef}
                                        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                                        style={{
                                            scrollbarWidth: 'none',
                                            msOverflowStyle: 'none',
                                        }}
                                    >
                                        {mostPopularAnime.map((anime, index) => (
                                            <div
                                                key={anime.id}
                                                className="flex-none w-[45%] md:w-[calc(25%-0.75rem)] snap-start"
                                            >
                                                <DiscoverAnimeCard
                                                    anime={{ ...anime, rating: anime.rating ?? 0 }}
                                                    category="most_popular"
                                                    positionInCarousel={index}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Arrow - External */}
                                <button
                                    onClick={() => scrollPopular('right')}
                                    className="hidden md:flex flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-darkInput border border-gray-300 dark:border-gray-600 items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transition-all text-black dark:text-white"
                                    aria-label="Scroll right"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </AnimeSection>
                )}
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
                    <div className="relative bg-white dark:bg-darkInput p-6 rounded-lg w-full max-w-[90%] sm:max-w-[720px]">
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
