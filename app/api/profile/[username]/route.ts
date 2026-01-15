import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// GET /api/profile/[username] - Get public profile by username
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params
        const supabase = await createClient()

        // Parallel fetch: profile + current user (independent operations)
        const [profileResult, userResult] = await Promise.all([
            supabase
                .from('profiles')
                .select('id, user_id, username, display_name, bio, avatar_url, created_at')
                .eq('username', username.toLowerCase())
                .single(),
            supabase.auth.getUser()
        ])

        const { data: profile, error: profileError } = profileResult
        const { data: { user } } = userResult

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        // Get user stats using the database function
        const { data: statsData, error: statsError } = await supabase
            .rpc('get_user_stats', { target_user_id: profile.user_id })

        if (statsError) {
            console.error('Error fetching user stats:', statsError)
            return NextResponse.json({
                profile,
                stats: {
                    watchlist_count: 0,
                    review_count: 0,
                    following_count: 0,
                    followers_count: 0
                }
            })
        }

        const stats = statsData[0] || {
            watchlist_count: 0,
            review_count: 0,
            following_count: 0,
            followers_count: 0
        }

        // Check if current user is following this profile
        let isFollowing = false

        if (user && user.id !== profile.user_id) {
            const { data: followData } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', user.id)
                .eq('following_id', profile.user_id)
                .single()

            isFollowing = !!followData
        }

        return NextResponse.json({
            profile,
            stats,
            isFollowing
        })
    } catch (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
