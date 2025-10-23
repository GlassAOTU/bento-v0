import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    if (code) {
        const supabase = await createClient()

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('[OAuth Callback] Error exchanging code:', error.message)
            // Redirect to home with error
            return NextResponse.redirect(`${origin}/?error=auth_failed`)
        }

        console.log('[OAuth Callback] Session created for user:', data.user?.email)

        // Redirect to home page after successful authentication
        return NextResponse.redirect(origin)
    }

    // If no code, redirect to home
    return NextResponse.redirect(origin)
}
