import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import WatchlistModal from "./WatchlistModal"
import { slugify } from "@/lib/utils/slugify"
import { trackRecommendationTrailerOpened, trackRecommendationExternalLinkClicked, trackWatchlistAddClicked, getAuthStatus } from "@/lib/analytics/events"
import { createClient } from '@/lib/supabase/browser-client'

export default function AnimeCard({ item, onTrailerClick }: {
    item: {
        title: string;
        reason: string;
        description: string;
        image: string;
        externalLinks: { url: string; site: string } | null;
        trailer: { id: string, site: string } | null;
    };
    onTrailerClick?: (trailerId: string) => void;
}) {
    const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const initAuth = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        initAuth()
    }, [])

    const handleTrailerClick = () => {
        if (item.trailer?.id) {
            trackRecommendationTrailerOpened({
                anime_title: item.title,
                source_page: 'recommendations'
            })
            onTrailerClick?.(item.trailer.id)
        }
    }

    const handleExternalLinkClick = () => {
        if (item.externalLinks) {
            trackRecommendationExternalLinkClicked({
                anime_title: item.title,
                platform: item.externalLinks.site,
                source_page: 'recommendations'
            })
        }
    }

    return (
        <div className="flex gap-6 mb-5 rounded-lg flex-col hover:scale-[102%] transition-all">
            {/* <div className="w-40 h-52 max-w-[950px] max-h-[208px] rounded-md overflow-hidden shadow-md bg-red-600"> */}
            <Link href={`/anime/${slugify(item.title)}`} className="rounded-md overflow-hidden flex items-center justify-center cursor-pointer">
                <Image
                    src={item.image || 'images/banner-not-available.png'} alt={item.title}
                    width={1900}
                    height={400}
                    className="object-cover w-full h-full"
                    priority={true}
                    loading="eager"
                />
            </Link>

            {/* </div> */}
            <div className="flex flex-col justify-between flex-1">
                <Link href={`/anime/${slugify(item.title)}`} className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    <h3 className="text-xl font-bold text-mySecondary dark:text-gray-100 mb-2 tracking-tighter">
                        {item.title}
                    </h3>
                </Link>
                <b className="italic mb-3 text-gray-800 dark:text-gray-200">{item.reason}</b>
                <p className="text-md text-mySecondary dark:text-gray-300 mb-4 tracking-tighter leading-relaxed">
                    {item.description}
                </p>

                <div className="flex flex-row justify-between items-center">
                    {/* Left side buttons */}
                    <div className="flex gap-3">
                        {item.externalLinks && (
                            <a
                                href={item.externalLinks.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block"
                                onClick={handleExternalLinkClick}
                            >
                                <button className="px-4 py-1 rounded-md border border-mySecondary/50 dark:border-gray-500 hover:bg-mySecondary/10 dark:hover:bg-gray-700 hover:border-mySecondary dark:hover:border-gray-400 transition-colors font-medium text-sm">{item.externalLinks.site}</button>
                            </a>
                        )}

                        {item.trailer && item.trailer.id && item.trailer.site && (
                            <button
                                onClick={handleTrailerClick}
                                className="px-4 py-1 rounded-md border border-mySecondary/50 dark:border-gray-500 hover:bg-mySecondary/10 dark:hover:bg-gray-700 hover:border-mySecondary dark:hover:border-gray-400 transition-colors font-medium text-sm"
                            >
                                Watch Trailer
                            </button>
                        )}
                    </div>

                    {/* Right side button */}
                    <button
                        onClick={() => {
                            trackWatchlistAddClicked({
                                anime_title: item.title,
                                source_page: 'recommendations',
                                auth_status: getAuthStatus(user)
                            })
                            setIsWatchlistModalOpen(true)
                        }}
                        className="px-4 py-1 rounded-md bg-[#F9F9F9] dark:bg-gray-700 text-black dark:text-white border-[0.5px] border-black dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
                    >
                        Add to Watchlist
                    </button>
                </div>
            </div>

            {/* Watchlist Modal */}
            <WatchlistModal
                isOpen={isWatchlistModalOpen}
                onClose={() => setIsWatchlistModalOpen(false)}
                anime={item}
            />
        </div>
    )
}

