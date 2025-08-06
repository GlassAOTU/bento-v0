import React, { useState, useRef, useEffect } from "react";

type Message = {
    role: "user" | "assistant";
    content: string;
};

const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hi! How can I help you today?" }
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
        <div className="w-full max-w-md mx-auto border rounded-lg shadow p-4 bg-white flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto mb-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`px-4 py-2 rounded-lg ${msg.role === "user"
                                ? "bg-mySecondary text-white"
                                : "bg-gray-200 text-gray-900"
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
                <input
                    className="flex-1 border rounded px-3 py-2 focus:outline-none"
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="bg-mySecondary text-white px-4 py-2 rounded disabled:opacity-50"
                    disabled={loading || !input.trim()}
                >
                    {loading ? "..." : "Send"}
                </button>
            </form>
        </div>
    );
};

export default Chatbot;