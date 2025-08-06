import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export const config = {
    runtime: 'edge',
}

export async function POST(request: Request) {
    const { messages } = await request.json();

    // Add a system prompt at the start
    const systemPrompt = {
        role: "system",
        content: `You are a spoiler-free anime wiki chatbot. 
        Answer questions about anime series, episodes, characters, and storylines without revealing any spoilers, plot twists, or future events. 
        If a user asks about a specific episode or the future of a series, provide general information, context, or hints without giving away any details that could spoil the experience. 
        Always encourage users to enjoy discovering the story themselves. 
        Never reveal major plot points, character fates, or surprises.`
    };
    const messagesWithPrompt = [systemPrompt, ...messages];

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: messagesWithPrompt,
        });
        const reply = completion.choices[0]?.message?.content?.trim();
        return NextResponse.json({ response: reply });
    } catch (error) {
        return NextResponse.json({ error: "Failed to get chatbot response" }, { status: 500 });
    }
}