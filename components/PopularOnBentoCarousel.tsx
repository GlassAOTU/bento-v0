'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { slugify } from '@/lib/utils/slugify'

type PopularAnime = {
    title: string
    image: string
    description: string
    watchlistCount: number
}

export default function PopularOnBentoCarousel() {
    const [popularAnime, setPopularAnime] = useState<PopularAnime[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchPopular = async () => {
            try {
                const response = await fetch('/api/watchlists/popular-anime')
                const data = await response.json()
                if (data.popular && data.popular.length > 0) {
                    setPopularAnime(data.popular)
                }
            } catch (error) {
                console.error('Failed to fetch popular anime:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchPopular()
    }, [])

    const goToSlide = useCallback((index: number) => {
        setCurrentIndex(index)
    }, [])

    const goToPrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? popularAnime.length - 1 : prev - 1))
    }, [popularAnime.length])

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev === popularAnime.length - 1 ? 0 : prev + 1))
    }, [popularAnime.length])

    useEffect(() => {
        if (popularAnime.length === 0) return

        const interval = setInterval(() => {
            goToNext()
        }, 5000)

        return () => clearInterval(interval)
    }, [popularAnime.length, goToNext])

    if (isLoading) {
        return (
            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                    <h2 className="text-3xl md:text-5xl font-semibold tracking-tight dark:text-white">Most Popular on Bento</h2>
                    <Image
                        src="/images/mascot-popular.png"
                        alt=""
                        width={60}
                        height={50}
                        className="object-contain w-10 h-8 md:w-[60px] md:h-[50px]"
                    />
                </div>
                <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            </section>
        )
    }

    if (popularAnime.length === 0) {
        return null
    }

    const currentAnime = popularAnime[currentIndex]

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 md:gap-3">
                <h2 className="text-3xl md:text-5xl font-semibold tracking-tight dark:text-white">Most Popular on Bento</h2>
                <Image
                    src="/images/mascot-popular.png"
                    alt=""
                    width={60}
                    height={50}
                    className="object-contain w-10 h-8 md:w-[60px] md:h-[50px]"
                />
            </div>

            <div className="relative group">
                <button
                    onClick={goToPrevious}
                    className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-darkInput/90 border border-gray-300 dark:border-gray-600 items-center justify-center shadow-lg hover:scale-110 transition-transform text-black dark:text-white opacity-0 group-hover:opacity-100"
                    aria-label="Previous slide"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>

                <button
                    onClick={goToNext}
                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-darkInput/90 border border-gray-300 dark:border-gray-600 items-center justify-center shadow-lg hover:scale-110 transition-transform text-black dark:text-white opacity-0 group-hover:opacity-100"
                    aria-label="Next slide"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>

                <Link href={`/anime/${slugify(currentAnime.title)}`}>
                    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-lg overflow-hidden bg-gray-900">
                        <Image
                            src={currentAnime.image}
                            alt={currentAnime.title}
                            fill
                            className="object-cover transition-transform duration-500"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h3 className="text-white text-xl md:text-2xl font-bold mb-2">{currentAnime.title}</h3>
                            <p className="text-white/80 text-sm md:text-base line-clamp-2 max-w-2xl">
                                {currentAnime.description}
                            </p>
                            {/* <p className="text-white/60 text-xs mt-2">
                                Added to {currentAnime.watchlistCount} watchlist{currentAnime.watchlistCount !== 1 ? 's' : ''}
                            </p> */}
                        </div>
                    </div>
                </Link>
            </div>

            <div className="flex justify-center gap-2">
                {popularAnime.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            index === currentIndex
                                ? 'w-12 bg-black dark:bg-white'
                                : 'w-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    )
}
