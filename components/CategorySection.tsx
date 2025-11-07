'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import DiscoverAnimeCard from './DiscoverAnimeCard'

type Anime = {
    id: number
    title: string
    image: string
    rating: number
}

type CategorySectionProps = {
    title: string
    anime: Anime[]
}

export default function CategorySection({ title, anime }: CategorySectionProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [scrollProgress, setScrollProgress] = useState(0)
    const isAdjustingRef = useRef(false)
    const hasInitializedRef = useRef(false)

    // Create infinite loop by duplicating items (3 copies total) - memoized to prevent re-creation
    const infiniteAnime = useMemo(() => [...anime, ...anime, ...anime], [anime])

    const checkScrollPosition = () => {
        const container = scrollContainerRef.current
        if (!container || isAdjustingRef.current) return

        const { scrollLeft, scrollWidth, clientWidth } = container
        const sectionWidth = scrollWidth / 3 // Each section (original + 2 duplicates)

        // Calculate progress based on position within the middle section
        const middleStart = sectionWidth
        const progressWithinMiddle = ((scrollLeft - middleStart) % sectionWidth + sectionWidth) % sectionWidth
        const progress = (progressWithinMiddle / sectionWidth) * 100
        setScrollProgress(Math.max(0, Math.min(100, progress)))

        // Seamlessly loop: jump to equivalent position when near edges
        if (scrollLeft < sectionWidth * 0.5) {
            // Near start of first section -> jump to start of second section
            isAdjustingRef.current = true
            container.scrollLeft = scrollLeft + sectionWidth
            setTimeout(() => { isAdjustingRef.current = false }, 50)
        } else if (scrollLeft > sectionWidth * 2.5) {
            // Near end of third section -> jump to end of second section
            isAdjustingRef.current = true
            container.scrollLeft = scrollLeft - sectionWidth
            setTimeout(() => { isAdjustingRef.current = false }, 50)
        }
    }

    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        // Only initialize scroll position once
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true
            // Start at middle section on mount (without smooth scroll)
            setTimeout(() => {
                const sectionWidth = container.scrollWidth / 3
                container.scrollLeft = sectionWidth
                checkScrollPosition()
            }, 100)
        }

        container.addEventListener('scroll', checkScrollPosition, { passive: true })
        window.addEventListener('resize', checkScrollPosition)

        return () => {
            container.removeEventListener('scroll', checkScrollPosition)
            window.removeEventListener('resize', checkScrollPosition)
        }
    }, [anime])

    const scroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current
        if (!container) return

        const scrollAmount = container.clientWidth * 0.8 // Scroll 80% of visible width
        const targetScroll = direction === 'left'
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        })
    }

    return (
        <section className="flex flex-col gap-4 w-full group">
            {/* Category Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold tracking-tight">{title}</h2>

                {/* Progress Bar */}
                <div className="hidden md:block w-20 h-1 bg-gray-300 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-black rounded-full transition-all duration-200"
                        style={{ width: `${scrollProgress}%` }}
                    />
                </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="relative">
                {/* Left Arrow - Always shown */}
                <button
                    onClick={() => scroll('left')}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full items-center justify-center bg-gradient-to-r from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    aria-label="Scroll left"
                >
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                    </div>
                </button>

                {/* Right Arrow - Always shown */}
                <button
                    onClick={() => scroll('right')}
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full items-center justify-center bg-gradient-to-l from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    aria-label="Scroll right"
                >
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </div>
                </button>

                {/* Right fade overlay for mobile peek effect */}
                <div className="md:hidden absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

                {/* Scrollable Anime Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    {infiniteAnime.map((item, index) => (
                        <div
                            key={`${item.id}-${index}`}
                            className="flex-none w-[75%] md:w-[calc(25%-0.75rem)] snap-start"
                        >
                            <DiscoverAnimeCard anime={item} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
