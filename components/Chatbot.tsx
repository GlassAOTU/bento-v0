import React, { useState, useRef, useEffect } from "react";

type Message = {
    role: "user" | "assistant";
    content: string;
};

const SendIcon = () => (
    <svg 
        className="w-5 h-5"
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

const LoadingBubble = () => (
    <div className="flex justify-start mb-2">
        <div className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
            <div className="flex space-x-2 items-center h-5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
        </div>
    </div>
);

const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Which anime series would you like to discuss? And what episode are you currently on?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessages: Message[] = [...messages, { role: "user" as const, content: input }];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chatbot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages }),
            });
            const data = await res.json();
            if (data.response) {
                setMessages([...newMessages, { role: "assistant", content: data.response }]);
            } else {
                setMessages([...newMessages, { role: "assistant", content: "Sorry, something went wrong." }]);
            }
        } catch {
            setMessages([...newMessages, { role: "assistant", content: "Sorry, something went wrong." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full border dark:border-gray-700 rounded-lg shadow p-4 bg-white dark:bg-darkBg flex flex-col md:h-[900px] h-[600px]">
            <div className="flex-1 overflow-y-auto mb-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`px-4 py-2 rounded-lg ${msg.role === "user"
                                ? "bg-mySecondary text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && <LoadingBubble />}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
                <input
                    className="flex-1 border dark:border-gray-600 rounded px-3 py-2 focus:outline-none bg-white dark:bg-darkInput dark:text-white dark:placeholder-gray-500"
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="bg-mySecondary text-white p-2 rounded disabled:opacity-50 min-w-[40px] flex items-center justify-center"
                    disabled={loading || !input.trim()}
                >
                    {loading ? "..." : <SendIcon />}
                </button>
            </form>
        </div>
    );
};

export default Chatbot;