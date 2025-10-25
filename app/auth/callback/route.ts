import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    // Get return URL from cookie (set by client before OAuth flow)
    const cookieStore = await cookies()
    const returnUrlCookie = cookieStore.get('auth_return_url')
    const returnUrl = returnUrlCookie?.value

    // Determine redirect URL - use returnUrl from cookie if provided, otherwise default to origin
    const redirectUrl = returnUrl ? `${origin}${decodeURIComponent(returnUrl)}` : origin

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

        // Redirect to the return URL (or home page) after successful authentication
        const response = NextResponse.redirect(redirectUrl)

        // Clear the return URL cookie after using it
        response.cookies.delete('auth_return_url')

        return response
    }

    // If no code, redirect to return URL or home
    const response = NextResponse.redirect(redirectUrl)

    // Clear the return URL cookie
    response.cookies.delete('auth_return_url')

    return response
}
