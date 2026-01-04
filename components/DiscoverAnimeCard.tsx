import Image from 'next/image'
import Link from 'next/link'
import { slugify } from '@/lib/utils/slugify'
import { trackDiscoverAnimeCardClick, getAuthStatus } from '@/lib/analytics/events'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

type DiscoverAnimeCardProps = {
    anime: {
        id: number
        title: string
        image: string
        rating: number
    }
    category?: string
    positionInCarousel?: number
}

export default function DiscoverAnimeCard({ anime, category = 'unknown', positionInCarousel = 0 }: DiscoverAnimeCardProps) {
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const initAuth = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        initAuth()
    }, [])

    // Convert text to Title Case
    const toTitleCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1)
        }).join(' ')
    }

    const handleClick = () => {
        trackDiscoverAnimeCardClick({
            anime_id: anime.id,
            anime_title: anime.title,
            category,
            position_in_carousel: positionInCarousel,
            auth_status: getAuthStatus(user)
        })
    }

    return (
        <Link
            href={`/anime/${slugify(anime.title)}`}
            className="flex flex-col gap-2 group cursor-pointer transition-transform duration-300 hover:-translate-y-2"
            onClick={handleClick}
        >
            <div className="relative w-full aspect-[309/455] overflow-hidden rounded-md shadow-sm group-hover:shadow-lg transition-shadow duration-300">
                <Image
                    src={anime.image}
                    alt={anime.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 50vw, 25vw"
                />
            </div>
            <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-tight line-clamp-2 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-300 transition-colors">
                    {toTitleCase(anime.title)}
                </h3>
                <div className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full bg-[#EEEEEE]/15 dark:bg-white/10 border border-black/[0.46] dark:border-white/[0.46]">
                    <span className="text-xs font-medium dark:text-white">{(anime.rating / 10).toFixed(1)}</span>
                    <span className="text-xs dark:text-white">☆</span>
                </div>
            </div>
        </Link>
    )
}
