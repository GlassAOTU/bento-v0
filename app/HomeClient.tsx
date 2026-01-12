'use client'

import './globals.css'

import Image from "next/image"
import { SetStateAction, useEffect, useState, Suspense } from "react"
import { useSearchParams } from 'next/navigation'
import { ScaleLoader } from "react-spinners"
import LimitPopup from "../components/LimitPopup"
import TagSelector from "../components/TagSelector"
import { useRecommendations } from "../lib/hooks/useRecommendations"

import AnimeSet from '../components/AnimeSet'
import NavigationBar from '../components/NavigationBar'
import Footer from '../components/Footer'
import { saveRecentSearch, RecentSearchResult } from '@/lib/utils/localStorage'
import AuthModal from '../components/AuthModal'
import { trackRecommendationSeeMoreClicked, getAuthStatus } from '@/lib/analytics/events'
import { useAuth } from '@/lib/auth/AuthContext'
import { useTheme } from '@/lib/theme/ThemeContext'

function RecommendationContent() {
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const { theme } = useTheme()

    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [isLimitPopupOpen, setLimitPopupOpen] = useState(false);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [authModalView, setAuthModalView] = useState<'signin' | 'signup'>('signin');
    const [activeTrailer, setActiveTrailer] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<{ description: string, tags: string[], timestamp: number }[]>([]);
    const [hasRestoredFromCache, setHasRestoredFromCache] = useState(false);

    const {
        recommendations,
        seenTitles,
        isLoading,
        isRateLimited,
        rateLimitInfo,
        error,
        getRecommendations,
        setRecommendations,
        setSeenTitles
    } = useRecommendations([], user)

    // Always restore from sessionStorage after mount (client-side only)
    useEffect(() => {
        if (hasRestoredFromCache) return;

        try {
            // Check if returning from auth flow (e.g., OAuth from watchlist)
            const isReturningFromAuth = sessionStorage.getItem('auth_flow_in_progress') === 'true';

            // Always restore cache to preserve results across page navigations
            const cachedRecs = sessionStorage.getItem('recommendations_data')
            const cachedHistory = sessionStorage.getItem('recommendations_history')
            const cachedSeenTitles = sessionStorage.getItem('recommendations_seenTitles')
            const cachedDescription = sessionStorage.getItem('recommendations_description')
            const cachedTags = sessionStorage.getItem('recommendations_tags')

            if (cachedRecs) {
                const parsedRecs = JSON.parse(cachedRecs)
                setRecommendations(parsedRecs)
            }

            if (cachedHistory) {
                const parsedHistory = JSON.parse(cachedHistory)
                setSearchHistory(parsedHistory)
            }

            if (cachedSeenTitles) {
                const parsedSeenTitles = JSON.parse(cachedSeenTitles)
                setSeenTitles(parsedSeenTitles)
            }

            if (cachedDescription) {
                setDescription(cachedDescription)
            }

            if (cachedTags) {
                const parsedTags = JSON.parse(cachedTags)
                setSelectedTags(parsedTags)
            }

            // Clear auth flow flags after restoration if returning from auth
            if (isReturningFromAuth) {
                sessionStorage.removeItem('auth_flow_in_progress')
                sessionStorage.removeItem('auth_return_url')
            }

            setHasRestoredFromCache(true)
        } catch (error) {
            console.error('Failed to restore from cache:', error)
            setHasRestoredFromCache(true)
        }
    }, [hasRestoredFromCache, setRecommendations, setSeenTitles])

    const openLimitPopup = () => {
        setLimitPopupOpen(true);
    };

    const closeLimitPopup = () => {
        setLimitPopupOpen(false);
    };

    const isButtonDisabled = isLoading || (selectedTags.length === 0 && description.trim() === "") || isRateLimited;

    // Save recommendations to sessionStorage whenever they change
    useEffect(() => {
        if (recommendations.length > 0) {
            sessionStorage.setItem('recommendations_data', JSON.stringify(recommendations))
        }
    }, [recommendations])

    // Save searchHistory to sessionStorage whenever it changes
    useEffect(() => {
        if (searchHistory.length > 0) {
            sessionStorage.setItem('recommendations_history', JSON.stringify(searchHistory))
        }
    }, [searchHistory])

    // Save seenTitles to sessionStorage whenever they change
    useEffect(() => {
        if (seenTitles.length > 0) {
            sessionStorage.setItem('recommendations_seenTitles', JSON.stringify(seenTitles))
        }
    }, [seenTitles])

    // Pre-fill from URL parameters (from recent searches)
    useEffect(() => {
        const urlDescription = searchParams.get('description')
        const urlTags = searchParams.get('tags')

        if (urlDescription) {
            setDescription(urlDescription)
        }

        if (urlTags) {
            setSelectedTags(urlTags.split(','))
        }
    }, [searchParams]);

    const handleGetRecommendations = async (append = false) => {
        console.log('[RecommendationPage] handleGetRecommendations called:', { append, isButtonDisabled, isRateLimited });

        if (isButtonDisabled) {
            if (isRateLimited) {
                console.log('[RecommendationPage] Opening limit popup');
                openLimitPopup();
            }
            return;
        }

        console.log('[RecommendationPage] Calling getRecommendations...');
        const result = await getRecommendations(description, selectedTags, append);
        console.log('[RecommendationPage] getRecommendations result:', result);

        function isSuccessResult(result: any): result is { success: true; data: any[] } {
            return result && result.success && Array.isArray(result.data);
        }

        if (result.error === "Rate limit reached") {
            console.log('[RecommendationPage] Rate limit error, opening popup');
            openLimitPopup();
            return;
        }

        // Only clear and update state if the request was successful
        if (isSuccessResult(result)) {
            console.log('[RecommendationPage] Success! Processing results...');

            // Clear sessionStorage AFTER confirming the request succeeded (not when appending)
            // NOTE: Don't clear React state here - the hook manages recommendations/seenTitles
            if (!append) {
                console.log('[RecommendationPage] Clearing previous sessionStorage (not appending)');
                sessionStorage.removeItem('recommendations_data');
                sessionStorage.removeItem('recommendations_history');
                sessionStorage.removeItem('recommendations_seenTitles');
                sessionStorage.removeItem('recommendations_description');
                sessionStorage.removeItem('recommendations_tags');
                setSearchHistory([]);
            }

            // Save current search parameters to sessionStorage
            sessionStorage.setItem('recommendations_description', description);
            sessionStorage.setItem('recommendations_tags', JSON.stringify(selectedTags));

            const currentQuery = { description, tags: selectedTags, timestamp: Date.now() };
            setSearchHistory(prev => [...prev, currentQuery]);
            console.log('[RecommendationPage] Updated search history');

            // Save successful search to localStorage
            if (result.data.length > 0) {
                const recentSearchResults: RecentSearchResult[] = result.data.map(anime => ({
                    title: anime.title,
                    image: anime.image,
                    reason: anime.reason,
                    description: anime.description
                }));

                console.log('[RecommendationPage] Saving search to localStorage:', {
                    description,
                    tags: selectedTags,
                    resultsCount: recentSearchResults.length,
                    results: recentSearchResults
                });

                saveRecentSearch(description, selectedTags, recentSearchResults);
                console.log('[RecommendationPage] Search saved successfully');
            }
        } else {
            console.log('[RecommendationPage] Result was not successful:', result);
        }
    };

    const handleSeeMore = () => {
        // Track see more click
        trackRecommendationSeeMoreClicked({
            current_results_count: recommendations.length,
            total_queries: searchHistory.length,
            auth_status: getAuthStatus(user)
        });

        handleGetRecommendations(true);
    };

    return (
        <div className="bg-white dark:bg-darkBg">

            <NavigationBar />

            <div className="min-h-screen text-mySecondary dark:text-gray-200 pb-16 font-instrument-sans">

                {/* Page content */}
                <div className="max-w-7xl flex flex-col mx-auto gap-8">

                    {/* Banner */}
                    <section className="flex justify-center sm:px-10 md:mb-10">
                        <div className="relative max-w-[1200px] w-full flex justify-center">
                            <Image
                                src={theme === 'dark' ? "/images/Dekstop Banner - Dark Mode.png" : "/images/header-image.png"}
                                alt="Banner"
                                width={600}
                                height={300}
                                className="hidden sm:inline w-full h-auto"
                            />
                            <Image
                                src={theme === 'dark' ? "/images/MobileBanner 1 (darkmode).png" : "/images/MobileBanner 1.png"}
                                alt="Banner"
                                width={400}
                                height={264}
                                className="sm:hidden w-full h-auto"
                            />
                        </div>
                    </section>

                    {/* User Description Section */}
                    <section className="px-10">
                        <p className="mb-2 text-xl">Share a short description of what you're looking for or choose some tags.</p>
                        <p className="mb-4 text-xl">We'll handle the rest.</p>
                        <input
                            placeholder="Write your description..."
                            className="w-full rounded-md border border-mySecondary/50 dark:border-gray-600 px-4 py-6 bg-white dark:bg-darkInput dark:text-white focus:outline-none focus:border-mySecondary hover:border-mySecondary transition-colors"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </section>

                    <div className="px-10 flex items-center gap-0">
                        <div className="w-6 border-t border-mySecondary/50"></div>
                        <span className="px-2 py-1 text-sm text-mySecondary dark:text-gray-300 bg-[#F9F9F9] dark:bg-darkInput border border-black/20 dark:border-gray-600 rounded">OR</span>
                        <div className="flex-1 border-t border-mySecondary/50"></div>
                    </div>

                    {/* Tags Section */}
                    <TagSelector
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                    />

                    {/* Search Button */}
                    <div className="px-10">
                        <button
                            className={`w-full mx-auto py-4 rounded-lg transition-colors text-white flex items-center justify-center gap-2 dark:border dark:border-gray-600
                                ${isButtonDisabled
                                    ? "bg-[#000000] cursor-not-allowed"
                                    : "bg-mySecondary hover:bg-[#2b2b2b] cursor-pointer"
                                }`}
                            disabled={isButtonDisabled}
                            onClick={() => handleGetRecommendations(false)}
                        >
                            {isLoading ? (
                                <>
                                    <ScaleLoader height={20} color="#ffffff" />
                                    Getting Recommendations...
                                </>
                            ) : ("Get Recommendations")}
                        </button>
                    </div>

                    {/* Recommendation Cards */}
                    <section className="flex flex-col px-10">
                        {(() => {
                            const setSize = 5;
                            const sets = [];
                            for (let i = 0; i < recommendations.length; i += setSize) {
                                sets.push(recommendations.slice(i, i + setSize));
                            }

                            // Reverse sets to show oldest first
                            const reversedSets = [...sets].reverse();
                            const reversedHistory = [...searchHistory].reverse();

                            return (
                                <>
                                    {/* Show existing sets */}
                                    {reversedSets.map((set, setIdx) => {
                                        const historyIdx = setIdx;
                                        const history = reversedHistory[historyIdx];
                                        const showHeader = set.length === setSize && history;

                                        return (
                                            <div key={setIdx}>
                                                <AnimeSet
                                                    description={history?.description || ""}
                                                    selectedTags={history?.tags || []}
                                                    searchHistory={searchHistory}
                                                    key={setIdx}
                                                    set={set}
                                                    onTrailerClick={(trailerId: SetStateAction<string | null>) => setActiveTrailer(trailerId)}
                                                />

                                                {showHeader && (
                                                    <div className='flex flex-col gap-1 mt-8 mb-4'>
                                                        {/* Query Description */}
                                                        {history.description.length !== 0 && (
                                                            <p className='text-xl font-normal text-black dark:text-white'>
                                                                {history.description.charAt(0).toLowerCase() + history.description.slice(1)}
                                                            </p>
                                                        )}

                                                        {/* Tags or "no tags selected" */}
                                                        {history.tags.length > 0 ? (
                                                            <p className='text-sm text-black dark:text-gray-300'>
                                                                {history.tags.join(', ')}
                                                            </p>
                                                        ) : (
                                                            <p className='text-sm text-black dark:text-gray-300'>no tags selected</p>
                                                        )}

                                                        {/* Timestamp */}
                                                        <p className='text-sm text-gray-400 dark:text-gray-500'>
                                                            {new Date(history.timestamp).toLocaleDateString('en-US', {
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                                year: '2-digit'
                                                            }).replace(/\//g, '.')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Show loading placeholder at the bottom */}
                                    {isLoading && (
                                        <div>
                                            <div className="flex flex-col gap-10">
                                                {[1, 2, 3, 4, 5].map((_, i) => (
                                                    <div key={i} className="rounded-lg overflow-hidden pb-5">
                                                        <div className="h-72 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                                                        <div className="p-4 space-y-2">
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* See More Button */}
                                    {recommendations.length > 0 && !isLoading && !isRateLimited && (
                                        <div className="px-10 mt-8">
                                            <button
                                                className="w-full mx-auto py-4 rounded-lg transition-colors text-white bg-mySecondary hover:bg-[#2b2b2b] cursor-pointer flex items-center justify-center gap-2"
                                                onClick={handleSeeMore}
                                            >
                                                See More
                                            </button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </section>
                </div>
            </div>

            <Footer />

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

            {/* Rate Limit Popup */}
            {isLimitPopupOpen && (
                <LimitPopup
                    message={rateLimitInfo?.message || "You've reached the rate limit. Please try again later."}
                    resetAt={rateLimitInfo?.resetAt || null}
                    isAuthenticated={!!user}
                    onClose={closeLimitPopup}
                    onAuthPrompt={(view) => {
                        setAuthModalView(view)
                        setAuthModalOpen(true)
                    }}
                />
            )}

            {/* Auth Modal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setAuthModalOpen(false)}
                initialView={authModalView}
            />

            {/* <BottomButton /> */}
        </div>
    );
}

export default function HomeClient() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        }>
            <RecommendationContent />
        </Suspense>
    );
}
