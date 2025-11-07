import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAnimeData, saveAnimeData } from '@/lib/supabase/anime-data'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

const AI_PROMPT = `Write a short anime synopsis in a reflective and descriptive tone. Use third-person storytelling, focusing on the main premise, emotional themes, and character motivations. Keep it very concise - around 250 characters (approximately 2-3 sentences). Use natural, polished language — expressive but not flowery. Maintain a tone similar to official anime synopses found on MyAnimeList or streaming platforms. Focus on the core story hook and emotional resonance.`

export async function POST(request: Request) {
    try {
        const { animeId, description, details, similar, popular } = await request.json()

        if (!animeId || !description) {
            return NextResponse.json(
                { error: 'Missing animeId or description' },
                { status: 400 }
            )
        }

        // Check if we already have AI description in database
        const cachedData = await getAnimeData(animeId)

        if (cachedData?.ai_description) {
            // Already have AI description, return it
            return NextResponse.json({
                description: cachedData.ai_description,
                fromCache: true
            })
        }

        // Generate AI description
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: AI_PROMPT
                    },
                    {
                        role: "user",
                        content: `Here is the original anime description:\n\n${description}`
                    }
                ],
                temperature: 0.7,
            }, {
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            let aiDescription = completion.choices[0]?.message?.content?.trim()

            if (!aiDescription) {
                aiDescription = description // Fallback to original
            }

            // Remove surrounding quotes if present
            if (aiDescription.startsWith('"') && aiDescription.endsWith('"')) {
                aiDescription = aiDescription.slice(1, -1)
            } else if (aiDescription.startsWith("'") && aiDescription.endsWith("'")) {
                aiDescription = aiDescription.slice(1, -1)
            }

            // Save everything to database (this is the first and only save)
            if (details && similar && popular) {
                await saveAnimeData(
                    animeId,
                    details,
                    similar,
                    popular,
                    aiDescription,
                    description
                )
            }

            return NextResponse.json({
                description: aiDescription,
                fromCache: false
            })

        } catch (openaiError: any) {
            clearTimeout(timeoutId)

            // If OpenAI fails, save with original description as AI description
            if (details && similar && popular) {
                await saveAnimeData(
                    animeId,
                    details,
                    similar,
                    popular,
                    description, // Use original as fallback
                    description
                )
            }

            return NextResponse.json({
                description,
                fromCache: false,
                fallback: true
            })
        }

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to generate AI description' },
            { status: 500 }
        )
    }
}
