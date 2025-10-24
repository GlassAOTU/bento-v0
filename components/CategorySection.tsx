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
    return (
        <section className="flex flex-col gap-4 w-full">
            {/* Category Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold uppercase tracking-tight">{title}</h2>
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                </button>
            </div>

            {/* Anime Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {anime.map((item) => (
                    <DiscoverAnimeCard key={item.id} anime={item} />
                ))}
            </div>
        </section>
    )
}
