import Image from 'next/image'
import Link from 'next/link'
import { slugify } from '@/lib/utils/slugify'

type DiscoverAnimeCardProps = {
    anime: {
        id: number
        title: string
        image: string
        rating: number
    }
}

export default function DiscoverAnimeCard({ anime }: DiscoverAnimeCardProps) {
    return (
        <Link href={`/anime/${slugify(anime.title)}`} className="flex flex-col gap-2 group cursor-pointer">
            <div className="relative w-full aspect-[309/455] overflow-hidden rounded-md">
                <Image
                    src={anime.image}
                    alt={anime.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                />
            </div>
            <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-tight line-clamp-2 group-hover:text-gray-700 transition-colors">
                    {anime.title}
                </h3>
                <div className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full bg-[#EEEEEE]/15 border border-black/[0.46]">
                    <span className="text-xs font-medium">{(anime.rating / 10).toFixed(1)}</span>
                    <span className="text-xs">☆</span>
                </div>
            </div>
        </Link>
    )
}
