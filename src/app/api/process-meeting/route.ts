/**
 * POST /api/process-meeting
 *
 * Receives the recorded audio (base64) + manual notes,
 * sends both to Gemini for multimodal processing, and saves the results
 * (transcript, summary, action items) to Firestore via Admin SDK.
 *
 * Body: { meetingId, audioBase64, mimeType, manualNotes }
 * Response: { ok: true } | { error: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        const { meetingId, audioBase64, mimeType, manualNotes } = await req.json();

        if (!meetingId || !audioBase64) {
            return NextResponse.json({ error: "meetingId e audioBase64 são obrigatórios." }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // ── Build the prompt ─────────────────────────────────────────────────────
        const systemPrompt = `Você é um assistente especializado em atas e anotações de reuniões.
Analise o áudio da reunião fornecido e as anotações manuais do participante.
As anotações manuais têm peso extra — elas representam o que o participante considerou mais importante.

Responda APENAS com um JSON válido, sem markdown, sem explicações extras, no seguinte formato:
{
  "transcript": "transcrição completa e fiel do áudio, em português",
  "summary": "resumo executivo da reunião em 3-5 parágrafos, destacando decisões, contexto e próximos passos",
  "actionItems": [
    { "text": "descrição clara da ação", "done": false }
  ]
}

Regras:
- A transcrição deve ser o mais fiel possível ao áudio.
- O resumo deve ser em português, claro e objetivo.
- Os action items devem ser ações concretas e atribuíveis.
- Se não houver áudio ou o áudio estiver vazio/inaudível, use as anotações manuais para gerar o conteúdo.
- Sempre retorne JSON válido.`;

        const parts = [
            { text: systemPrompt },
            ...(manualNotes
                ? [{ text: `\n\n--- ANOTAÇÕES MANUAIS DO PARTICIPANTE ---\n${manualNotes}\n---` }]
                : []),
            {
                inlineData: {
                    mimeType: mimeType || "audio/webm",
                    data: audioBase64,
                },
            },
        ];

        const result = await model.generateContent(parts);
        const responseText = result.response.text().trim();

        // ── Parse JSON safely ────────────────────────────────────────────────────
        let parsed: { transcript: string; summary: string; actionItems: { text: string; done: boolean }[] };
        try {
            const clean = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
            parsed = JSON.parse(clean);
        } catch {
            parsed = {
                transcript: responseText,
                summary: "Não foi possível gerar um resumo estruturado. Veja a transcrição completa.",
                actionItems: [],
            };
        }

        // ── Save to Firestore via Admin SDK ──────────────────────────────────────
        const db = getAdminDb();
        await db.doc(`meetings/${meetingId}/aiResults/main`).set({
            transcript: parsed.transcript || "",
            summary: parsed.summary || "",
            actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
            generatedAt: FieldValue.serverTimestamp(),
        });

        await db.doc(`meetings/${meetingId}`).update({
            status: "done",
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[process-meeting] Error:", err);
        const message = err instanceof Error ? err.message : "Erro interno.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
