import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server-client'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export const runtime = 'edge'

export async function POST(request: Request) {

    // Parse the request body first for validation
    const { description, tags, seenTitles } = await request.json()

    // Input validation
    const descriptionLength = description?.trim().length || 0
    const hasValidTags = tags && tags.length > 0

    if (descriptionLength < 10 && !hasValidTags) {
        return NextResponse.json(
            { error: 'Please provide at least 10 characters in description or select at least one tag.' },
            { status: 400 }
        )
    }

    if (descriptionLength > 500) {
        return NextResponse.json(
            { error: 'Description is too long. Please keep it under 500 characters.' },
            { status: 400 }
        )
    }

    // Detect if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Determine rate limit namespace and identifier
    const namespace = user ? 'recommendations_authenticated' : 'recommendations_anonymous'
    const identifier = user?.id ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    // Check tiered rate limit
    const rateLimitResult = await checkRateLimit(identifier, namespace)

    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            {
                error: user
                    ? 'Rate limit exceeded. Authenticated users can make 15 requests per 10 minutes.'
                    : 'Rate limit exceeded. Anonymous users can make 5 requests per 10 minutes. Sign in for higher limits.',
                resetAt: rateLimitResult.resetAt
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': rateLimitResult.resetAt || '',
                }
            }
        )
    }

    const prompt = `You are an anime recommendation engine.
                    Based on the following input, recommend exactly 7 distinct animes, matching the described themes or genres, and/or the provided tags.
                    Do not recommend any pornographic animes.
                    Only allow animes from the same franchise if the description explicitly allows it.
                    Include both modern and classic animes where appropriate.
                    Respond in plaintext only. No extra commentary.
                    Respond with the official anime title as listed on AniList only.
                    Avoid including extra subtitles, editions, or years unless it is essential.
                    Give only official anime titles, no fan-made or unofficial titles, no fandubs, no expansions, extra content, or spin-offs.
                    If the anime has a remake, use the remake title.
                    Do not repeat any animes that are already in the ${seenTitles} list.
                    If user input is nonsence, disregard it and only accept premade tags and ignore the description.
                    If all else fails, display random animes from the list of 1000 most popular animes.
                    Give a 1-2 sentence reasoning on why the specific anime is similar to the user's input.


                    Format the response as:
                    [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason]
                    Input:
                    Description: ${description || "None"}
                    Tags: ${tags.length ? tags.join(", ") : "None"}`

    try {
        // Call OpenAI API with the prompt
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        })
        const reply = completion.choices[0]?.message?.content?.trim()

        // Return with rate limit headers
        return NextResponse.json(
            { recommendations: reply },
            {
                headers: {
                    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                    'X-RateLimit-Reset': rateLimitResult.resetAt || '',
                }
            }
        )
    } catch (error) {
        console.error("[OpenAI Route] OpenAI API error:", error)
        return NextResponse.json({ error: "Failed to get recommendations woooooooo" }, { status: 500 })
    }
}