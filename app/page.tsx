'use client'

import './globals.css'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser-client'
import NavigationBar from '../components/NavigationBar'
import Footer from '../components/Footer'
import CategorySection from '../components/CategorySection'

type Anime = {
    id: number
    title: string
    image: string
    rating: number
}

type AnimeCategories = {
    mostPopular: Anime[]
    shonen: Anime[]
    isekai: Anime[]
    foundFamily: Anime[]
}

export default function Home() {
    const [user, setUser] = useState<User | null>(null)
    const [animeData, setAnimeData] = useState<AnimeCategories | null>(null)

    useEffect(() => {
        const initAuth = async () => {
            const supabase = await createClient()

            // Get initial session
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null)
            })

            return () => subscription.unsubscribe()
        }

        const loadAnimeData = async () => {
            try {
                const response = await fetch('/data/popular-anime.json')
                const data: AnimeCategories = await response.json()
                setAnimeData(data)
                console.log('Anime data:', data)
            } catch (error) {
                console.error('Failed to load anime data:', error)
            }
        }

        initAuth()
        loadAnimeData()
    }, [])

    return (
        <div className="bg-white">
            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
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

                    {/* Categories */}
                    {animeData && (
                        <section className="px-10 flex flex-col gap-12">
                            <CategorySection
                                title="MOST POPULAR"
                                anime={animeData.mostPopular}
                            />
                            <CategorySection
                                title="SHONEN"
                                anime={animeData.shonen}
                            />
                            <CategorySection
                                title="ISEKAI (SLICE OF LIFE)"
                                anime={animeData.isekai}
                            />
                            <CategorySection
                                title="FOUND FAMILY WITH NO INCEST PLOTLINES"
                                anime={animeData.foundFamily}
                            />
                        </section>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}
