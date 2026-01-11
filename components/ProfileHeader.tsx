'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthContext'

export default function ProfileHeader() {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex flex-col items-center py-12">
                <div className="w-36 h-36 bg-gray-200 dark:bg-gray-700 animate-pulse mb-4" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    // Get avatar URL (prioritize profile, then OAuth metadata)
    const avatarUrl = profile?.avatar_url ||
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null

    // Generate initials
    const displayText = profile?.display_name || user.email || 'User'
    const initials = displayText
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const ProfileContent = (
        <div className="flex flex-col items-center py-12">
            {/* Avatar */}
            <div className="w-36 h-36 rounded-lg overflow-hidden mb-4 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt="Profile"
                        width={144}
                        height={144}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-4xl font-bold">{initials}</span>
                )}
            </div>

            {/* Username only */}
            {profile?.username && (
                <p className="text-xl font-medium text-gray-900 dark:text-white">@{profile.username}</p>
            )}
        </div>
    )

    // If user has a profile, make it a link to their public profile
    if (profile?.username) {
        return (
            <Link href={`/profile/${profile.username}`} className="hover:opacity-80 transition-opacity">
                {ProfileContent}
            </Link>
        )
    }

    return ProfileContent
}
