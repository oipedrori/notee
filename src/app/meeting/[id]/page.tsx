"use client";

/**
 * Active Meeting page — handles an individual meeting which could be:
 *   - RECORDING: shows editor + audio recorder
 *   - PROCESSING: shows "processing..." state
 *   - DONE: renders the post-meeting detail view
 *
 * Route: /meeting/[id]
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import RecordButton from "@/components/meeting/RecordButton";
import NotesEditor from "@/components/meeting/NotesEditor";
import AISummaryPanel from "@/components/meeting/AISummaryPanel";
import TranscriptAccordion from "@/components/meeting/TranscriptAccordion";
import ChatPanel from "@/components/meeting/ChatPanel";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { getMeeting, updateMeeting, type Meeting } from "@/lib/firestore";
import { blobToBase64 } from "@/hooks/useAudioRecorder";


export default function MeetingPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("Reunião sem título");
    const [notes, setNotes] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const titleSaveTimer = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch meeting data ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        getMeeting(id as string).then((m) => {
            if (!m) { router.push("/dashboard"); return; }
            setMeeting(m);
            setTitle(m.title);
            setNotes(m.manualNotes);
            setLoading(false);
        });
    }, [id, router]);

    // ── Debounced title save ───────────────────────────────────────────────────
    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
        titleSaveTimer.current = setTimeout(() => {
            updateMeeting(id as string, { title: newTitle || "Reunião sem título" });
        }, 800);
    };

    // ── Called when recording stops ────────────────────────────────────────────
    const handleRecordingStop = useCallback(
        async (audioBlob: Blob, durationSec: number) => {
            if (!user) return;
            setIsProcessing(true);
            setError(null);
            try {
                // 1. Save notes and update status (sem Storage)
                await updateMeeting(id as string, {
                    status: "processing",
                    duration: durationSec,
                    manualNotes: notes,
                });

                // 2. Converter blob para base64 e enviar direto ao Gemini
                const audioBase64 = await blobToBase64(audioBlob);

                // 3. Chamar a API route de processamento
                const res = await fetch("/api/process-meeting", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        meetingId: id,
                        audioBase64,
                        mimeType: audioBlob.type || "audio/webm",
                        manualNotes: notes,
                    }),
                });

                if (!res.ok) {
                    const { error: msg } = await res.json();
                    throw new Error(msg || "Erro ao processar com IA.");
                }

                // 4. Atualizar o estado local com a reunião finalizada
                const updated = await getMeeting(id as string);
                setMeeting(updated);
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Erro inesperado.";
                setError(msg);
                await updateMeeting(id as string, { status: "error" });
            } finally {
                setIsProcessing(false);
            }
        },
        [id, user, notes]
    );


    if (loading) {
        return (
            <AppShell>
                <div className="flex h-full items-center justify-center">
                    <Spinner size={28} />
                </div>
            </AppShell>
        );
    }

    const isDone = meeting?.status === "done";

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto px-8 py-10 fade-in">
                {/* ── Editable title ──────────────────────────────────── */}
                <div className="mb-6">
                    <textarea
                        className="notion-title w-full resize-none overflow-hidden leading-[1.2]"
                        value={title}
                        onChange={(e) => {
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                            handleTitleChange(e.target.value);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        placeholder="Reunião sem título"
                        rows={1}
                        disabled={isDone || isProcessing}
                        aria-label="Título da reunião"
                    />
                </div>

                {/* ── Processing state ─────────────────────────────────── */}
                {isProcessing && (
                    <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-[var(--notion-bg-alt)] border border-[var(--notion-border)]">
                        <Spinner size={18} />
                        <p className="text-[14px] text-[var(--notion-text-secondary)]">
                            Processando com IA — isso pode levar até 30s…
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[14px] text-red-700">
                        ⚠️ {error}
                    </div>
                )}

                {/* ── RECORDING MODE ───────────────────────────────────── */}
                {!isDone && !isProcessing && (
                    <>
                        <div className="mb-6">
                            <RecordButton
                                meetingId={id as string}
                                onStop={handleRecordingStop}
                            />
                        </div>
                        <NotesEditor
                            value={notes}
                            onChange={setNotes}
                            meetingId={id as string}
                        />
                    </>
                )}

                {/* ── POST-MEETING MODE ─────────────────────────────────── */}
                {isDone && (
                    <div className="space-y-8">
                        <AISummaryPanel meetingId={id as string} />

                        {/* Manual notes (read-only display) */}
                        {notes && (
                            <div>
                                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)] mb-3">
                                    Suas Anotações
                                </h2>
                                <div className="text-[15px] leading-[1.75] text-[var(--notion-text)] whitespace-pre-wrap bg-[var(--notion-bg-alt)] rounded-xl px-4 py-4 border border-[var(--notion-border)]">
                                    {notes}
                                </div>
                            </div>
                        )}

                        <TranscriptAccordion meetingId={id as string} />

                        <ChatPanel meetingId={id as string} />
                    </div>
                )}
            </div>
        </AppShell>
    );
}
