'use client'

import '../app/globals.css'

import Image from "next/image"
import { SetStateAction, useEffect, useState } from "react"
import { ScaleLoader } from "react-spinners"
import AnimeCard from "../components/AnimeCard"
import BottomButton from "../components/BottomButton"
import LimitPopup from "../components/LimitPopup"
// import WaitlistBox from "../components/waitlist-box"
import WaitlistPopup from "../components/WaitlistPopup"
import TagSelector from "../components/TagSelector"
import { useRecommendations } from "../lib/hooks/useRecommendations"

import posthog from 'posthog-js';
import AnimeSet from '../components/AnimeSet'
// import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Home() {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [isWelcomePopupOpen, setWelcomePopupOpen] = useState(false);
    const [isLimitPopupOpen, setLimitPopupOpen] = useState(false);
    // const [isWaitlistBoxOpen, setWaitlistBoxOpen] = useState(false);
    const [isWaitlistPopupOpen, setWaitlistPopupOpen] = useState(false);
    const [activeTrailer, setActiveTrailer] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<{ description: string, tags: string[], timestamp: number }[]>([]);
    const {
        recommendations,
        isLoading,
        isRateLimited,
        error,
        getRecommendations
    } = useRecommendations()

    const handleWelcomePopup = () => {
        setWelcomePopupOpen(false);
        localStorage.setItem('hasVisitedBefore', 'true');
    };

    const openLimitPopup = () => {
        setLimitPopupOpen(true);
    };

    const closeLimitPopup = () => {
        setLimitPopupOpen(false);
    };

    const isButtonDisabled = isLoading || (selectedTags.length === 0 && description.trim() === "") || isRateLimited;

    useEffect(() => {
        const hasVisited = localStorage.getItem('hasVisitedBefore');
        const isStillRateLimited = localStorage.getItem('rateLimited');

        if (!hasVisited) {
            setWelcomePopupOpen(true);
        }

        if (isStillRateLimited) {
            openLimitPopup();
        }
    }, []);

    const handleGetRecommendations = async (append = false) => {
        if (isButtonDisabled) {
            if (isRateLimited)
                openLimitPopup();
            return;
        }

        const currentQuery = { description, tags: selectedTags, timestamp: Date.now() };
        setSearchHistory(prev => [...prev, currentQuery]);

        const result = await getRecommendations(description, selectedTags);

        function isSuccessResult(result: any): result is { success: true; data: any[] } {
            return result && result.success && Array.isArray(result.data);
        }

        if (result.error === "Rate limit reached") {
            openLimitPopup();
            return;
        }
    };

    const handleSeeMore = () => {
        handleGetRecommendations(true);
    };

    return (
        <div className="bg-white">

            {/* <Navbar onJoinWaitlist={() => setWaitlistPopupOpen(true)} /> */}

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">

                {/* Welcome Popup */}
                {isWelcomePopupOpen && (
                    <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center z-50" onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleWelcomePopup();
                        }
                    }}>
                        <div className="relative">
                            <Image src="/images/welcome-popup.png" alt="Popup" width={900} height={600} className="rounded-xl drop-shadow" />
                            <button onClick={handleWelcomePopup} className="absolute top-0 right-0 p-2 m-4 rounded-full border-2 text-xs sm:text-md border-mySecondary/50 hover:border-mySecondary transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Page content */}
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

                    {/* User Description Section */}
                    <section className="px-10">
                        <p className="mb-2 text-xl">Share a short description of what you're looking for or choose some tags.</p>
                        <p className="mb-4 text-xl">We'll handle the rest.</p>
                        <input
                            placeholder="Write your description..."
                            className="w-full rounded-md border border-mySecondary/50 px-4 py-6 bg-white focus:outline-none focus:border-mySecondary hover:border-mySecondary transition-colors"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </section>

                    <div className="px-10">
                        <hr />
                    </div>

                    {/* Tags Section */}
                    <TagSelector
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                    />

                    {/* Search Button */}
                    <div className="px-10">
                        <button
                            className={`w-full mx-auto py-4 rounded-lg transition-colors text-white flex items-center justify-center gap-2
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
                                                {showHeader && (
                                                    <div className='bg-[#f8f8f8] flex justify-center p-4 mb-8'>
                                                        <div className='flex flex-col gap-1 items-center'>
                                                            <span className='text-center font-bold text-black'>
                                                                {new Date(history.timestamp).toLocaleTimeString([], {
                                                                    hour: 'numeric',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })}
                                                            </span>
                                                            {history.description.length !== 0 && (
                                                                <span className='text-black'>{history.description.charAt(0).toUpperCase() + history.description.slice(1)}</span>
                                                            )}
                                                            {history.tags.length !== 0 && (
                                                                <div className='flex flex-row gap-2'>
                                                                    {history.tags.map((tag, i) =>
                                                                        <div key={i} className='px-2 border text-sm border-black text-black bg-white border-opacity-25'>
                                                                            {tag}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <AnimeSet
                                                    description={history?.description || ""}
                                                    selectedTags={history?.tags || []}
                                                    searchHistory={searchHistory}
                                                    key={setIdx}
                                                    set={set}
                                                    onTrailerClick={(trailerId: SetStateAction<string | null>) => setActiveTrailer(trailerId)}
                                                />
                                            </div>
                                        );
                                    })}

                                    {/* Show loading placeholder at the bottom */}
                                    {isLoading && (
                                        <div>
                                            <div className="flex flex-col gap-10">
                                                {[1, 2, 3, 4, 5].map((_, i) => (
                                                    <div key={i} className="rounded-lg overflow-hidden pb-5">
                                                        <div className="h-72 bg-gray-200 animate-pulse"></div>
                                                        <div className="p-4 space-y-2">
                                                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                                            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
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

            {isWaitlistPopupOpen && (
                <WaitlistPopup onClose={() => setWaitlistPopupOpen(false)} />
            )}

            {/* <BottomButton /> */}
        </div>
    );
}