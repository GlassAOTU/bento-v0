import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

const RESERVED_USERNAMES = [
    'discover', 'watchlists', 'anime', 'api', 'auth', 'profile',
    'settings', 'admin', 'help', 'about', 'terms', 'privacy',
    'login', 'signup', 'register', 'signout', 'logout', 'search',
    'explore', 'home', 'feed', 'notifications', 'messages', 'user'
]

const PROFILE_AVATARS = [
    '/images/profiles/edward2.png',
    '/images/profiles/gojo2.png',
    '/images/profiles/maomao2.png',
    '/images/profiles/momo2.png',
    '/images/profiles/tanjiro2.png',
]

function getRandomAvatar(): string {
    return PROFILE_AVATARS[Math.floor(Math.random() * PROFILE_AVATARS.length)]
}

// GET /api/profile - Get current user's profile
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (profileError) {
            // Profile doesn't exist yet
            return NextResponse.json(
                { profile: null },
                { status: 200 }
            )
        }

        return NextResponse.json({ profile })
    } catch (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}

// POST /api/profile - Create profile (claim username)
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { username, display_name, bio, avatar_url } = body

        // Validate username
        if (!username || typeof username !== 'string') {
            return NextResponse.json(
                { error: 'Username is required' },
                { status: 400 }
            )
        }

        // Validate username format (lowercase, alphanumeric + underscore/hyphen, 3-20 chars)
        const usernameRegex = /^[a-z0-9_-]{3,20}$/
        if (!usernameRegex.test(username)) {
            return NextResponse.json(
                { error: 'Username must be 3-20 characters and contain only lowercase letters, numbers, underscores, and hyphens' },
                { status: 400 }
            )
        }

        // Check if username is reserved
        if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
            return NextResponse.json(
                { error: 'This username is reserved' },
                { status: 400 }
            )
        }

        // Check if user already has a profile
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (existingProfile) {
            return NextResponse.json(
                { error: 'Profile already exists' },
                { status: 409 }
            )
        }

        // Create profile
        const { data: profile, error: insertError } = await supabase
            .from('profiles')
            .insert({
                user_id: user.id,
                username: username.toLowerCase(),
                display_name: display_name || null,
                bio: bio || null,
                avatar_url: avatar_url || getRandomAvatar()
            })
            .select()
            .single()

        if (insertError) {
            // Check if it's a unique constraint violation
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { error: 'Username already taken' },
                    { status: 409 }
                )
            }

            console.error('Error creating profile:', insertError)
            return NextResponse.json(
                { error: 'Failed to create profile' },
                { status: 500 }
            )
        }

        return NextResponse.json({ profile }, { status: 201 })
    } catch (error) {
        console.error('Error creating profile:', error)
        return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
        )
    }
}

// PATCH /api/profile - Update own profile
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { display_name, bio, avatar_url } = body

        // Validate bio length if provided
        if (bio && bio.length > 500) {
            return NextResponse.json(
                { error: 'Bio must be 500 characters or less' },
                { status: 400 }
            )
        }

        // Build update object (only include provided fields)
        const updates: any = {}
        if (display_name !== undefined) updates.display_name = display_name
        if (bio !== undefined) updates.bio = bio
        if (avatar_url !== undefined) updates.avatar_url = avatar_url

        // Update profile
        const { data: profile, error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating profile:', updateError)
            return NextResponse.json(
                { error: 'Failed to update profile' },
                { status: 500 }
            )
        }

        return NextResponse.json({ profile })
    } catch (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}
