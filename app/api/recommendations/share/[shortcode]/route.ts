import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server-client'
import { createServiceClient } from '@/lib/supabase/service-client'

type RouteContext = {
    params: Promise<{ shortcode: string }>
}

export async function GET(request: Request, context: RouteContext) {
    try {
        const params = await context.params
        const shortcode = params.shortcode?.toLowerCase()

        if (!shortcode || shortcode.length !== 8) {
            return NextResponse.json(
                { error: 'Invalid shortcode' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { data: share, error } = await supabase
            .from('shared_recommendations')
            .select('*')
            .eq('shortcode', shortcode)
            .single()

        if (error || !share) {
            return NextResponse.json(
                { error: 'Share not found' },
                { status: 404 }
            )
        }

        const cookieStore = await cookies()
        const viewCookieName = `share_viewed_${shortcode}`
        const hasViewed = cookieStore.get(viewCookieName)

        if (!hasViewed) {
            const serviceClient = createServiceClient()
            await serviceClient
                .from('shared_recommendations')
                .update({
                    view_count: share.view_count + 1,
                    last_viewed_at: new Date().toISOString()
                })
                .eq('id', share.id)

            const response = NextResponse.json({
                shortcode: share.shortcode,
                recommendations: share.recommendations,
                prompt: share.prompt,
                promptTruncated: share.prompt_truncated,
                tags: share.tags,
                viewCount: share.view_count + 1,
                createdAt: share.created_at
            })

            response.cookies.set(viewCookieName, 'true', {
                maxAge: 24 * 60 * 60,
                httpOnly: true,
                sameSite: 'lax'
            })

            return response
        }

        return NextResponse.json({
            shortcode: share.shortcode,
            recommendations: share.recommendations,
            prompt: share.prompt,
            promptTruncated: share.prompt_truncated,
            tags: share.tags,
            viewCount: share.view_count,
            createdAt: share.created_at
        })

    } catch (error) {
        console.error('Error fetching share:', error)
        return NextResponse.json(
            { error: 'Failed to fetch share' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        const params = await context.params
        const shortcode = params.shortcode?.toLowerCase()

        if (!shortcode || shortcode.length !== 8) {
            return NextResponse.json(
                { error: 'Invalid shortcode' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { data: share, error } = await supabase
            .from('shared_recommendations')
            .select('recommendations, tags, prompt')
            .eq('shortcode', shortcode)
            .single()

        if (error || !share) {
            return NextResponse.json(
                { error: 'Share not found' },
                { status: 404 }
            )
        }

        const seenTitles = share.recommendations.map((rec: { title: string }) => rec.title)

        return NextResponse.json({
            recommendations: share.recommendations,
            seenTitles,
            tags: share.tags,
            prompt: share.prompt
        })

    } catch (error) {
        console.error('Error forking share:', error)
        return NextResponse.json(
            { error: 'Failed to fork share' },
            { status: 500 }
        )
    }
}
