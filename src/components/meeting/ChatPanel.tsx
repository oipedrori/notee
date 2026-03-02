"use client";

/**
 * ChatPanel — contextual AI chat for a specific meeting.
 * Sends questions to /api/chat which uses Gemini with full meeting context.
 */
import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { getChatMessages, saveChatMessage, type ChatMessage } from "@/lib/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatPanelProps {
    meetingId: string;
}

export default function ChatPanel({ meetingId }: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getChatMessages(meetingId).then(setMessages);
    }, [meetingId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || sending) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: trimmed,
            createdAt: { toDate: () => new Date() } as never,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setSending(true);

        try {
            // Save user message to Firestore
            await saveChatMessage(meetingId, { role: "user", content: trimmed });

            // Build history for Gemini (exclude the just-saved user message to avoid duplication)
            const history = messages.map((m) => ({ role: m.role, content: m.content }));

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ meetingId, message: trimmed, history }),
            });

            if (!res.ok) throw new Error("Erro ao contatar a IA.");
            const { reply } = await res.json();

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: reply,
                createdAt: { toDate: () => new Date() } as never,
            };

            setMessages((prev) => [...prev, aiMsg]);
            await saveChatMessage(meetingId, { role: "assistant", content: reply });
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: "err",
                    role: "assistant",
                    content: "Desculpe, ocorreu um erro. Tente novamente.",
                    createdAt: { toDate: () => new Date() } as never,
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="border border-[var(--notion-border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--notion-border)] bg-[var(--notion-bg-alt)]">
                <MessageSquare size={14} className="text-[var(--notion-text-secondary)]" />
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">
                    Chat com a Reunião
                </h2>
            </div>

            {/* Messages */}
            <div className="px-4 py-4 space-y-4 max-h-96 overflow-y-auto">
                {messages.length === 0 && (
                    <p className="text-[14px] text-[var(--notion-text-secondary)] text-center py-6">
                        Faça uma pergunta sobre esta reunião.{" "}
                        <span className="block text-[12px] mt-1">
                            Ex: "Qual foi o prazo acordado?" ou "Quem fica responsável pelo projeto?"
                        </span>
                    </p>
                )}

                {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isUser ? "justify-end" : "justify-start"} fade-in`}
                        >
                            <div
                                className={`max-w-[80%] px-3.5 py-2.5 text-[14px] leading-[1.6] ${isUser ? "chat-bubble-user" : "chat-bubble-ai"
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    );
                })}

                {sending && (
                    <div className="flex justify-start">
                        <div className="chat-bubble-ai px-3.5 py-2.5 flex items-center gap-2 text-[var(--notion-text-secondary)]">
                            <Loader2 size={13} className="animate-spin" />
                            <span className="text-[13px]">Pensando…</span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-[var(--notion-border)] px-3 py-3 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Pergunte algo sobre esta reunião..."
                    className="flex-1 text-[14px] bg-transparent border-none outline-none text-[var(--notion-text)] placeholder:text-[var(--notion-text-secondary)]"
                    disabled={sending}
                    aria-label="Mensagem para o chat"
                />
                <button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--notion-text)] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                    aria-label="Enviar mensagem"
                >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
            </div>
        </div>
    );
}
