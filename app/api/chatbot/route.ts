import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export const runtime = 'edge'

export async function POST(request: Request) {
    const { messages } = await request.json();

    // Add a system prompt at the start
    const systemPrompt = {
        role: "system",
        content: `You are an anime discussion companion that helps users explore anime series safely without spoilers.

        First, you must:
        1. Ask which anime series they're watching
        2. Ask which episode they're currently on
        3. Remember this information for the conversation

        Rules you must follow:
        - Only discuss events and information up to their current episode
        - Never reveal future plot points, character developments, or story arcs
        - If they ask about future events, politely decline and encourage them to keep watching
        - If they haven't specified their progress, ask them which episode they're on before answering
        - If discussing characters or events, only reference what has been shown up to their current episode
        - When answering questions, specify which episode range you're discussing (e.g., "Based on episodes 1-12...")

        Begin by asking: "Which anime series would you like to discuss? And what episode are you currently on?"`
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