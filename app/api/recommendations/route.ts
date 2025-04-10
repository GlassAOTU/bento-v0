import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
    const { description, tags, seenTitles } = await request.json()
    const prompt = `You are an anime recommendation engine.
                    Based on the following input, recommend exactly 5 distinct animes, matching the described themes or genres, and/or the provided tags.
                    Do not recommend any pornographic animes.
                    Only allow animes from the same franchise if the description explicitly allows it.
                    Include both modern and classic animes where appropriate.
                    Format the response as:
                    [title] | [title] | [title] | [title] | [title]
                    Respond in plaintext only. No extra commentary.
                    Respond with the official anime title as listed on AniList only. 
                    Avoid including extra subtitles, editions, or years unless it is essential.
                    Give only official anime titles, no fan-made or unofficial titles, no fandubs, no expansions, extra content, or spin-offs.
                    If the anime has a remake, use the remake title.
                    Do not repeat any animes that are already in the ${seenTitles} list.
                    If user input is nonsence, disregard it and only accept premade tags and ignore the description.
                    If all else fails, display random animes from the list of 1000 most popular animes.

                    Input:
                    Description: ${description || "None"}
                    Tags: ${tags.length ? tags.join(", ") : "None"}`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });

        const reply = completion.choices[0]?.message?.content?.trim();

        return NextResponse.json({ recommendations: reply });
    } catch (error) {
        console.error("OpenAI error:", error);
        return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });

    }
}