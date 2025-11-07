'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'
import { User } from '@supabase/supabase-js'
import Image from 'next/image'

export default function ProfileHeader() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchUser() {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)
            } catch (error) {
                console.error('Error fetching user:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUser()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col items-center py-8">
                <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse mb-4" />
                <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    // Try to get avatar from user metadata (OAuth providers)
    const avatarUrl = user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null

    // Generate initials from email
    const email = user.email || 'User'
    const initials = email
        .split('@')[0]
        .split(/[._-]/)
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className="flex flex-col items-center py-8">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt="Profile"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-white text-2xl font-bold">{initials}</span>
                )}
            </div>

            {/* Email */}
            <p className="text-lg font-medium text-gray-900">{email}</p>
        </div>
    )
}
