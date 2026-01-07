export function DescriptionSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
        </div>
    )
}

export default function AnimePageSkeleton() {
    return (
        <div className="bg-white dark:bg-darkBg min-h-screen">
            {/* Hero Section Skeleton */}
            <section className="relative w-full h-[300px] md:h-[400px] bg-gray-900 animate-pulse">
                {/* Banner placeholder */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-gray-700 to-gray-600" />

                {/* Back button placeholder */}
                <div className="absolute top-6 left-6 md:left-10 z-20 p-3 bg-gray-700 rounded-full w-12 h-12" />

                {/* Hero content */}
                <div className="relative z-10 h-full flex items-end">
                    <div className="max-w-7xl mx-auto w-full px-10 pb-12">
                        {/* Add to watchlist button */}
                        <div className="h-10 w-48 bg-gray-300 dark:bg-gray-600 rounded-md mb-4"></div>
                        {/* Title */}
                        <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                        {/* English title */}
                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-10 py-12">
                {/* Description Section Skeleton */}
                <section className="mb-16">
                    <DescriptionSkeleton />
                </section>

                {/* Details Section Skeleton */}
                <section className="mb-16">
                    <div className="flex items-center justify-between mb-6">
                        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 animate-pulse">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex">
                                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mr-4"></div>
                                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Similar Anime Section Skeleton */}
                <section className="mb-16">
                    <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col animate-pulse">
                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"></div>
                                <div className="mt-3 h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Most Popular Section Skeleton */}
                <section className="mb-16">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col animate-pulse">
                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"></div>
                                <div className="mt-3 h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
