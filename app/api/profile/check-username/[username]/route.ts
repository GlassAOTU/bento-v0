import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

// GET /api/profile/check-username/[username] - Check if username is available
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params
        const supabase = await createClient()

        // Validate username format
        const usernameRegex = /^[a-z0-9_-]{3,20}$/
        if (!usernameRegex.test(username.toLowerCase())) {
            return NextResponse.json({
                available: false,
                error: 'Username must be 3-20 characters and contain only lowercase letters, numbers, underscores, and hyphens'
            })
        }

        // Check if username exists
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username.toLowerCase())
            .single()

        if (error && error.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" which means available
            console.error('Error checking username:', error)
            return NextResponse.json(
                { error: 'Failed to check username availability' },
                { status: 500 }
            )
        }

        // If data exists, username is taken
        const available = !data

        return NextResponse.json({ available })
    } catch (error) {
        console.error('Error checking username:', error)
        return NextResponse.json(
            { error: 'Failed to check username availability' },
            { status: 500 }
        )
    }
}
