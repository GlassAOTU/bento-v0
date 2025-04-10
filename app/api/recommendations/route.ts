import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
    try {
        const { description, tags } = await request.json()

        // Combine description and tags into a single prompt
        // const prompt = `${description} ${tags.join(', ')}`
        let prompt = "recommend me 5 animes";
        if (!!description) {
            prompt = prompt + ` that are like the following description: ${description}`;
            if (tags.length != 0) {
                prompt = prompt + ' and'
            }
        }

        if (tags.length > 0) {
            prompt = prompt + ' are within one of the following genres: ${tags.join(", ")}';
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                {
                    role: "user",
                    content: `${prompt},
          if question is ranking based or uses words like 'best', 'top', 'favorite', then base off ranking data.
          if description wants movies or shows from the same series (ie:'best one piece movies'), then base off series.
          if asked about animes like or similar to one directly named, do not mention other forms of media from that same series.
          the answer can be anime movies and anime shows, but no manga or books, etc, and no hentai or pornographic content. 
          answer only in titles and descriptions, the description being two sentences only. 
          the format of the 5 should be: [title] ~ [description] | [title] ~ [description] | [title] ~ [description] | [title] ~ [description] | [title] ~ [description]. 
          no markdown formatting, only plain text`,
                },
            ],
            store: true,
        })

        return NextResponse.json({
            recommendations: completion.choices[0].message.content
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json(
            { error: 'Failed to get recommendations' },
            { status: 500 }
        )
    }
}