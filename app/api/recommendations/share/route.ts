import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { createServiceClient } from '@/lib/supabase/service-client'
import { checkRateLimit } from '@/lib/rateLimit'
import { generateShortcode } from '@/lib/utils/shortcode'
import { generateWatchlistCover } from '@/lib/utils/generateWatchlistCover'

const MAX_RECOMMENDATIONS = 50
const STORAGE_BUCKET = 'recommendation-covers'
const MAX_PROMPT_LENGTH = 200
const MAX_COLLISION_RETRIES = 3

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required to share recommendations' },
                { status: 401 }
            )
        }

        const rateLimitResult = await checkRateLimit(user.id, 'share_recommendations')
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: 'Daily share limit reached (10/day)',
                    resetAt: rateLimitResult.resetAt
                },
                { status: 429 }
            )
        }

        const body = await request.json()
        const { recommendations, prompt, tags } = body

        if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
            return NextResponse.json(
                { error: 'At least one recommendation is required' },
                { status: 400 }
            )
        }

        const truncatedRecs = recommendations.slice(0, MAX_RECOMMENDATIONS)

        let truncatedPrompt = prompt || ''
        let promptTruncated = false
        if (truncatedPrompt.length > MAX_PROMPT_LENGTH) {
            truncatedPrompt = truncatedPrompt.slice(0, MAX_PROMPT_LENGTH - 3) + '...'
            promptTruncated = true
        }

        const sanitizedTags = Array.isArray(tags) ? tags.slice(0, 20) : []

        let shortcode = ''
        let retries = 0
        let inserted = false

        while (retries < MAX_COLLISION_RETRIES && !inserted) {
            shortcode = generateShortcode()

            const { error: insertError } = await supabase
                .from('shared_recommendations')
                .insert({
                    shortcode,
                    user_id: user.id,
                    recommendations: truncatedRecs,
                    prompt: truncatedPrompt || null,
                    prompt_truncated: promptTruncated,
                    tags: sanitizedTags,
                    cover_image_url: null
                })

            if (!insertError) {
                inserted = true
            } else if (insertError.code === '23505') {
                retries++
            } else {
                console.error('Error creating share:', insertError)
                return NextResponse.json(
                    { error: 'Failed to create share' },
                    { status: 500 }
                )
            }
        }

        if (!inserted) {
            return NextResponse.json(
                { error: 'Failed to generate unique share link' },
                { status: 500 }
            )
        }

        let coverImageUrl: string | null = null
        const imageUrls = truncatedRecs
            .map((r: { image?: string }) => r.image)
            .filter((img): img is string => Boolean(img))
            .slice(0, 3)

        if (imageUrls.length >= 3) {
            try {
                const serviceClient = createServiceClient()
                const coverBuffer = await generateWatchlistCover(imageUrls)
                const fileName = `${shortcode}-${Date.now()}.png`

                const { error: uploadError } = await serviceClient.storage
                    .from(STORAGE_BUCKET)
                    .upload(fileName, coverBuffer, {
                        contentType: 'image/png',
                        upsert: true
                    })

                if (!uploadError) {
                    const { data: urlData } = serviceClient.storage
                        .from(STORAGE_BUCKET)
                        .getPublicUrl(fileName)
                    coverImageUrl = urlData.publicUrl

                    await supabase
                        .from('shared_recommendations')
                        .update({ cover_image_url: coverImageUrl })
                        .eq('shortcode', shortcode)
                }
            } catch (coverError) {
                console.error('Cover generation failed:', coverError)
            }
        }

        const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/$/, '').split('/').slice(0, 3).join('/') || 'https://www.bentoanime.com'
        const shareUrl = `${origin}/r/${shortcode}`

        return NextResponse.json({
            shortcode,
            url: shareUrl,
            coverImageUrl,
            remaining: rateLimitResult.remaining
        }, { status: 201 })

    } catch (error) {
        console.error('Error creating share:', error)
        return NextResponse.json(
            { error: 'Failed to create share' },
            { status: 500 }
        )
    }
}
