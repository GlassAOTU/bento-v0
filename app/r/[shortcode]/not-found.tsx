'use client'

import Link from 'next/link'
import NavigationBar from '@/components/NavigationBar'
import Footer from '@/components/Footer'

export default function NotFound() {
    return (
        <div className="bg-white dark:bg-darkBg min-h-screen flex flex-col">
            <NavigationBar />
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                <h1 className="text-4xl font-bold text-mySecondary dark:text-white mb-4">
                    Share Not Found
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                    This shared recommendation link has expired or doesn&apos;t exist.
                </p>
                <Link
                    href="/"
                    className="px-6 py-3 bg-mySecondary text-white rounded-lg hover:bg-[#2b2b2b] transition-colors"
                >
                    Discover Anime
                </Link>
            </div>
            <Footer />
        </div>
    )
}
