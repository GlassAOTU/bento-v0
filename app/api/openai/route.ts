import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { checkRateLimit } from '@/lib/rateLimit'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

// tells vercel to run route as edge function
export const config = {
    runtime: 'edge',
}

export async function POST(request: Request) {
    // grab the IP address from the request headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    // check the rate limit for the IP address
    const allowed = await checkRateLimit(ip, 'chatgpt')
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please wait before trying again.' },
            { status: 429 }
        )
    }

    // Parse the request body
    const { description, tags, seenTitles } = await request.json()
    const prompt = `You are an anime recommendation engine.
                    Based on the following input, recommend exactly 5 distinct animes, matching the described themes or genres, and/or the provided tags.
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
                    [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason] | [title] ~ [reason]
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
        return NextResponse.json({ recommendations: reply })
    } catch (error) {
        console.error("OpenAI error:", error)
        return NextResponse.json({ error: "Failed to get recommendations woooooooo" }, { status: 500 })
    }
}