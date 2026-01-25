import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server-client'
import { fetchSimilarAnime, searchAnime } from '@/lib/anilist'
import { normalizeTitleForMatch } from '@/lib/recommendations/normalizeTitle'
const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
})

export const runtime = 'edge'

const MODEL_RECOMMENDATION_COUNT = 10
const ANILIST_CANDIDATE_COUNT = 25

const ABBREVIATION_MAP: Record<string, string> = {
    'jjk': 'Jujutsu Kaisen',
    'aot': 'Attack on Titan',
    'frieren': 'Frieren: Beyond Journey\'s End'
}

function extractMentionedTitles(description: string): string[] {
    const mentioned: string[] = []
    const lowerDesc = description.toLowerCase()

    for (const [abbr, fullTitle] of Object.entries(ABBREVIATION_MAP)) {
        if (lowerDesc.includes(abbr)) {
            mentioned.push(fullTitle)
        }
    }

    const patterns = [
        /(?:like|similar to|enjoyed|loved|want more|fans of|if you like)\s+["']?([^"',.\n]+)["']?/gi
    ]

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(description)) !== null) {
            const title = match[1].trim()
            if (title.length > 2 && title.length < 100) {
                mentioned.push(title)
            }
        }
    }

    const unique = new Set<string>()
    const results: string[] = []
    for (const title of mentioned) {
        const key = normalizeTitleForMatch(title)
        if (!key || unique.has(key)) continue
        unique.add(key)
        results.push(title)
    }

    return results
}

export async function POST(request: Request) {
    const requestStart = Date.now()
    const { description, tags, seenTitles } = await request.json()
    const safeTags: string[] = Array.isArray(tags) ? tags : []
    const safeSeenTitles: string[] = Array.isArray(seenTitles) ? seenTitles : []

    const descriptionLength = description?.trim().length || 0
    const hasValidTags = safeTags.length > 0

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

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const namespace = user ? 'recommendations_authenticated' : 'recommendations_anonymous'
    const identifier = user?.id ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    const rateLimitStart = Date.now()
    const rateLimitResult = await checkRateLimit(identifier, namespace)
    console.log('[Recommendations Route] rate limit check', {
        ms: Date.now() - rateLimitStart,
        allowed: rateLimitResult.allowed,
        namespace
    })

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
                    'X-RateLimit-Reset': rateLimitResult.resetAt || ''
                }
            }
        )
    }

    const mentionedTitles = extractMentionedTitles(description || '')
    const mentionedKeys = mentionedTitles.map((title) => normalizeTitleForMatch(title)).filter(Boolean)
    const seenKeys = new Set(safeSeenTitles.map((title) => normalizeTitleForMatch(title)))

    let candidateTitles: string[] = []
    if (mentionedTitles.length > 0) {
        const searchResults = await searchAnime(mentionedTitles[0], 1)
        const seed = searchResults[0]
        if (seed?.id) {
            const similar = await fetchSimilarAnime(seed.id, ANILIST_CANDIDATE_COUNT)
            candidateTitles = similar
                .map((rec) => rec.title)
                .filter(Boolean)
                .filter((title) => {
                    const key = normalizeTitleForMatch(title)
                    if (!key) return false
                    if (seenKeys.has(key)) return false
                    if (mentionedKeys.includes(key)) return false
                    return true
                })
        }
    }

    const hasCandidates = candidateTitles.length >= MODEL_RECOMMENDATION_COUNT
    const prompt = hasCandidates
        ? `You are selecting anime recommendations from a provided list.
Pick exactly ${MODEL_RECOMMENDATION_COUNT} distinct titles from the list below.
Use only titles from the list. Use English titles when available.
Do not include any titles the user mentioned: ${mentionedTitles.join(', ') || 'None'}.
Give a 1-2 sentence reason for each pick.

List:
${candidateTitles.join('\n')}

Format:
[title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason]`
        : `You are an anime recommendation engine.
Based on the following input, recommend exactly ${MODEL_RECOMMENDATION_COUNT} distinct animes, matching the described themes or genres, and/or the provided tags.
Do not recommend any pornographic animes.
Only allow animes from the same franchise if the description explicitly allows it.
Include both modern and classic animes where appropriate.
Respond in plaintext only. No extra commentary.
Respond with the official anime title as listed on AniList only. Use the English title when available.
Avoid including extra subtitles, editions, or years unless it is essential.
Give only official anime titles, no fan-made or unofficial titles, no fandubs, no expansions, extra content, or spin-offs.
If the anime has a remake, use the remake title.
If the user misspells a title, infer the intended anime.
Do not repeat any animes that are already in the ${JSON.stringify(safeSeenTitles)} list.
IMPORTANT: Do NOT recommend any anime that the user explicitly mentions in their description. If they say "like Steins;Gate" or "similar to Attack on Titan", do not include those anime in your recommendations.
If user input is nonsense, disregard it and only accept premade tags and ignore the description.
If all else fails, display random animes from the list of 1000 most popular animes.
Give a 1-2 sentence reasoning on why the specific anime is similar to the user's input.

Format the response as:
[title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason]
Input:
Description: ${description || 'None'}
Tags: ${safeTags.length ? safeTags.join(', ') : 'None'}`

    try {
        const llmStart = Date.now()
        const completion = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }]
        })
        const reply = completion.choices[0]?.message?.content?.trim() || ''
        console.log('[Recommendations Route] LLM completion', {
            ms: Date.now() - llmStart,
            chars: reply.length
        })

        console.log('[Recommendations Route] request finished', {
            ms: Date.now() - requestStart
        })

        return NextResponse.json(
            { recommendations: reply },
            {
                headers: {
                    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                    'X-RateLimit-Reset': rateLimitResult.resetAt || ''
                }
            }
        )
    } catch (error) {
        console.error('[Recommendations Route] DeepSeek API error:', error)
        return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
    }
}
