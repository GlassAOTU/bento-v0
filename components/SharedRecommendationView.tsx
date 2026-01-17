'use client'

import { useState, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import NavigationBar from './NavigationBar'
import Footer from './Footer'
import AnimeSet from './AnimeSet'
import { AnimeRecommendation } from '@/lib/hooks/useRecommendations'
import {
    trackSharedRecommendationCopied,
    trackSharedRecommendationForked
} from '@/lib/analytics/events'

type Props = {
    shortcode: string
    recommendations: AnimeRecommendation[]
    prompt: string | null
    promptTruncated: boolean
    tags: string[]
    viewCount: number
    createdAt: string
}

export default function SharedRecommendationView({
    shortcode,
    recommendations,
    prompt,
    promptTruncated,
    tags,
    viewCount,
    createdAt
}: Props) {
    const router = useRouter()
    const [activeTrailer, setActiveTrailer] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [isForking, setIsForking] = useState(false)

    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://bentoanime.com'}/r/${shortcode}`

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            trackSharedRecommendationCopied({ shortcode })
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleSeeMore = async () => {
        setIsForking(true)
        try {
            const res = await fetch(`/api/recommendations/share/${shortcode}`, {
                method: 'POST'
            })

            if (!res.ok) throw new Error('Failed to fork')

            const data = await res.json()

            sessionStorage.setItem('recommendations_data', JSON.stringify(data.recommendations))
            sessionStorage.setItem('recommendations_seenTitles', JSON.stringify(data.seenTitles))
            if (data.tags?.length > 0) {
                sessionStorage.setItem('recommendations_tags', JSON.stringify(data.tags))
            }
            if (data.prompt) {
                sessionStorage.setItem('recommendations_description', data.prompt)
            }

            // Flag to auto-trigger "See More" on home page
            sessionStorage.setItem('recommendations_auto_load', 'true')

            trackSharedRecommendationForked({ shortcode, count: data.recommendations.length })

            router.push('/')
        } catch (err) {
            console.error('Failed to fork recommendations:', err)
            setIsForking(false)
        }
    }

    const setSize = 5
    const sets = []
    for (let i = 0; i < recommendations.length; i += setSize) {
        sets.push(recommendations.slice(i, i + setSize))
    }
    const reversedSets = [...sets].reverse()

    return (
        <div className="bg-white dark:bg-darkBg">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary dark:text-gray-200 pb-16 font-instrument-sans">
                <div className="max-w-7xl flex flex-col mx-auto gap-8">
                    <section className="px-10 pt-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-mySecondary dark:text-white">
                                    Shared Recommendations
                                </h1>
                                {prompt && (
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        &ldquo;{prompt}&rdquo;{promptTruncated && '...'}
                                    </p>
                                )}
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                    {recommendations.length} recommendations · {viewCount} views
                                </p>
                            </div>

                            <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-2 px-4 py-2 border border-mySecondary/50 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                            >
                                {copied ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 6 9 17l-5-5"/>
                                        </svg>
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                        </svg>
                                        Copy Link
                                    </>
                                )}
                            </button>
                        </div>
                    </section>

                    <section className="flex flex-col px-10">
                        {reversedSets.map((set, setIdx) => (
                            <div key={setIdx}>
                                <AnimeSet
                                    description=""
                                    selectedTags={[]}
                                    searchHistory={[]}
                                    set={set}
                                    onTrailerClick={(trailerId: SetStateAction<string | null>) => setActiveTrailer(trailerId)}
                                />
                            </div>
                        ))}

                        <div className="mt-8">
                            <button
                                onClick={handleSeeMore}
                                disabled={isForking}
                                className="w-full py-4 rounded-lg transition-colors text-white bg-mySecondary hover:bg-[#2b2b2b] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isForking ? 'Loading...' : 'See More Like These'}
                            </button>
                            <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-2">
                                Continue generating similar recommendations
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            <Footer />

            {activeTrailer && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={(e) => {
                    if (e.target === e.currentTarget) setActiveTrailer(null)
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
