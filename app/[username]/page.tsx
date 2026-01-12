import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server-client'
import ProfileClient from './ProfileClient'

interface PageProps {
    params: Promise<{ username: string }>
}

async function getProfileByUsername(username: string) {
    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url')
        .eq('username', username.toLowerCase())
        .single()
    return profile
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { username } = await params
    const profile = await getProfileByUsername(username)

    if (!profile) {
        return {
            title: 'Profile Not Found | Bento Anime',
            description: 'This profile does not exist.',
        }
    }

    const displayName = profile.display_name || profile.username
    const description = profile.bio || `Check out ${displayName}'s anime watchlists and reviews on Bento Anime.`

    return {
        title: `${displayName}'s Anime Profile | Bento Anime`,
        description,
        openGraph: {
            title: `${displayName} on Bento Anime`,
            description,
            type: 'profile',
            images: profile.avatar_url ? [{ url: profile.avatar_url }] : undefined,
        },
        twitter: {
            card: 'summary',
            site: '@animebento',
            title: `${displayName} on Bento Anime`,
            description,
        },
        alternates: {
            canonical: `https://bentoanime.com/${profile.username}`,
        },
    }
}

export default async function ProfilePage({ params }: PageProps) {
    const { username } = await params
    return <ProfileClient username={username} />
}
