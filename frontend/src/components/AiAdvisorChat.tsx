import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { AiChatMessage } from "../api/types";

export default function AiAdvisorChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<AiChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const params = useParams();

    // Try to extract weekId from URL
    const weekId = params.weekId ? Number(params.weekId) : undefined;

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: AiChatMessage = { role: "user", content: text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const windowedMessages = newMessages.slice(-20);
            const res = await api.askAdvisor(windowedMessages, weekId);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: res.reply },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I couldn't process that request. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* FAB */}
            <button
                onClick={() => setOpen(!open)}
                className={`fixed z-50 bottom-20 right-4 lg:bottom-6 lg:right-6
                    w-14 h-14 rounded-full flex items-center justify-center
                    bg-gradient-to-br from-violet-600 to-purple-700
                    hover:from-violet-500 hover:to-purple-600
                    shadow-xl shadow-violet-500/30 transition-all duration-300
                    ${open ? "rotate-0 scale-90" : "rotate-0 scale-100"}
                    text-white text-2xl`}
                title="AI Advisor"
                aria-label={open ? "Close AI Advisor" : "Open AI Advisor"}
            >
                {open ? "✕" : "🤖"}
            </button>

            {/* Chat panel */}
            {open && (
                <div
                    className="fixed z-50 bottom-36 right-4 lg:bottom-22 lg:right-6
                        w-[360px] max-h-[520px] rounded-2xl overflow-hidden
                        border border-white/10 bg-gray-900/95 backdrop-blur-xl
                        shadow-2xl shadow-black/40 flex flex-col"
                >
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-violet-600/90 to-purple-700/90 border-b border-white/10">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                            🤖 AI Restaurant Advisor
                        </h4>
                        <p className="text-xs text-white/60">
                            {weekId ? `Context: Week #${weekId}` : "General advice"}
                        </p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[360px]">
                        {messages.length === 0 && (
                            <div className="text-center text-sm text-gray-400 py-8">
                                <p className="text-3xl mb-2">💬</p>
                                <p>Ask me anything about your restaurant operations!</p>
                                <div className="mt-3 space-y-1 text-xs text-gray-500">
                                    <p>"How can I improve Friday dinner revenue?"</p>
                                    <p>"Is my food cost percentage healthy?"</p>
                                    <p>"Suggest staffing changes for peak hours"</p>
                                </div>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                                        ${m.role === "user"
                                            ? "bg-violet-600 text-white rounded-br-md"
                                            : "bg-white/10 text-gray-200 rounded-bl-md"
                                        }`}
                                >
                                    {m.content.split("\n").map((line, j) => (
                                        <p key={j} className={j > 0 ? "mt-1.5" : ""}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-white/10 bg-gray-900/80">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && send()}
                                placeholder="Ask about your restaurant…"
                                className="flex-1 rounded-xl bg-white/10 border border-white/10 px-3.5 py-2
                                    text-sm text-white placeholder:text-gray-500
                                    focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30
                                    transition-colors"
                                disabled={loading}
                            />
                            <button
                                onClick={send}
                                disabled={loading || !input.trim()}
                                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500
                                    disabled:opacity-40 disabled:cursor-not-allowed
                                    transition-colors text-white text-sm font-medium"
                                aria-label="Send message"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
