/**
 * POST /api/chat
 *
 * Answers questions about a specific meeting using Gemini,
 * with full context: transcript, summary, manual notes, and conversation history.
 * Uses Firebase Admin SDK for server-side Firestore access.
 *
 * Body: { meetingId, message, history: [{role, content}] }
 * Response: { reply: string } | { error: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ActionItem { text: string; done: boolean }

export async function POST(req: NextRequest) {
    try {
        const { meetingId, message, history = [] } = await req.json();

        if (!meetingId || !message) {
            return NextResponse.json({ error: "meetingId e message são obrigatórios." }, { status: 400 });
        }

        const db = getAdminDb();

        // ── Fetch meeting context from Firestore (Admin SDK) ─────────────────────
        const [meetingSnap, aiSnap] = await Promise.all([
            db.doc(`meetings/${meetingId}`).get(),
            db.doc(`meetings/${meetingId}/aiResults/main`).get(),
        ]);

        const meeting = meetingSnap.data();
        const aiResults = aiSnap.data();

        // ── Build system context ─────────────────────────────────────────────────
        const contextParts: string[] = [
            "Você é um assistente especializado em reuniões. Responda apenas com base nas informações da reunião fornecidas abaixo.",
            "Seja direto, preciso e responda em português.",
            "",
        ];

        if (aiResults?.summary) contextParts.push(`=== RESUMO DA REUNIÃO ===\n${aiResults.summary}`);
        if (meeting?.manualNotes) contextParts.push(`\n=== ANOTAÇÕES MANUAIS ===\n${meeting.manualNotes}`);
        if (aiResults?.transcript) contextParts.push(`\n=== TRANSCRIÇÃO COMPLETA ===\n${aiResults.transcript}`);
        if (aiResults?.actionItems?.length) {
            const items = (aiResults.actionItems as ActionItem[]).map((a, i) => `${i + 1}. ${a.text}`).join("\n");
            contextParts.push(`\n=== ACTION ITEMS ===\n${items}`);
        }

        const systemContext = contextParts.join("\n");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // ── Build multi-turn history for Gemini ──────────────────────────────────
        const geminiHistory = [
            {
                role: "user" as const,
                parts: [{ text: `Contexto da reunião para suas respostas:\n\n${systemContext}` }],
            },
            {
                role: "model" as const,
                parts: [{ text: "Entendido. Estou pronto para responder perguntas sobre esta reunião." }],
            },
            ...history.map((h: { role: string; content: string }) => ({
                role: h.role === "user" ? ("user" as const) : ("model" as const),
                parts: [{ text: h.content }],
            })),
        ];

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        // ── Save messages to Firestore ───────────────────────────────────────────
        const chatRef = db.collection(`meetings/${meetingId}/chatMessages`);
        await chatRef.add({ role: "user", content: message, createdAt: FieldValue.serverTimestamp() });
        await chatRef.add({ role: "assistant", content: reply, createdAt: FieldValue.serverTimestamp() });

        return NextResponse.json({ reply });
    } catch (err) {
        console.error("[chat] Error:", err);
        const message = err instanceof Error ? err.message : "Erro interno.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
