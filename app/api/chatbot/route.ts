import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export const config = {
    runtime: 'edge',
}

export async function POST(request: Request) {
    const { messages } = await request.json(); // messages: [{role, content}, ...]

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages, // pass the whole conversation
        });
        const reply = completion.choices[0]?.message?.content?.trim();
        return NextResponse.json({ response: reply });
    } catch (error) {
        return NextResponse.json({ error: "Failed to get chatbot response" }, { status: 500 });
    }
}