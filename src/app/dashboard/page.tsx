"use client";

/**
 * Dashboard — lists all past meetings with a "Nova Reunião" CTA.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Clock, Tag, Loader2, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { getUserMeetings, createMeeting, type Meeting } from "@/lib/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDuration(seconds: number) {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    recording: { label: "Gravando", color: "bg-red-100 text-red-700" },
    processing: { label: "Processando", color: "bg-yellow-100 text-yellow-700" },
    done: { label: "Pronta", color: "bg-green-100 text-green-700" },
    error: { label: "Erro", color: "bg-red-100 text-red-700" },
};

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!user) return;
        getUserMeetings(user.uid)
            .then(setMeetings)
            .finally(() => setLoading(false));
    }, [user]);

    const handleNewMeeting = async () => {
        if (!user || creating) return;
        setCreating(true);
        try {
            const id = await createMeeting(user.uid);
            router.push(`/meeting/${id}`);
        } finally {
            setCreating(false);
        }
    };

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto px-8 py-10 fade-in">
                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex items-baseline justify-between mb-8">
                    <div>
                        <h1 className="text-[2rem] font-bold text-[var(--notion-text)] tracking-tight">
                            Reuniões
                        </h1>
                        <p className="text-[14px] text-[var(--notion-text-secondary)] mt-1">
                            {meetings.length} reunião{meetings.length !== 1 ? "ões" : ""} registrada{meetings.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <button
                        onClick={handleNewMeeting}
                        disabled={creating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--notion-text)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                        {creating ? (
                            <Loader2 size={15} className="animate-spin" />
                        ) : (
                            <Plus size={15} />
                        )}
                        Nova Reunião
                    </button>
                </div>

                {/* ── Content ────────────────────────────────────── */}
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-12 bg-[var(--notion-hover)] rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                ) : meetings.length === 0 ? (
                    /* ── Empty state ─────────────────────────────── */
                    <div className="flex flex-col items-center justify-center py-24 text-center fade-in">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--notion-bg-alt)] border border-[var(--notion-border)] flex items-center justify-center mb-4">
                            <FileText size={24} className="text-[var(--notion-text-secondary)]" />
                        </div>
                        <p className="text-[16px] font-semibold text-[var(--notion-text)] mb-1">
                            Nenhuma reunião ainda
                        </p>
                        <p className="text-[13px] text-[var(--notion-text-secondary)] mb-6 max-w-xs">
                            Clique em "Nova Reunião" para começar a gravar e anotar sua primeira reunião.
                        </p>
                        <button
                            onClick={handleNewMeeting}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--notion-text)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
                        >
                            <Plus size={14} />
                            Nova Reunião
                        </button>
                    </div>
                ) : (
                    /* ── Meetings table ───────────────────────────── */
                    <div className="border border-[var(--notion-border)] rounded-xl overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_160px_100px_110px_32px] gap-4 px-4 py-2 bg-[var(--notion-bg-alt)] border-b border-[var(--notion-border)]">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">Título</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">Data</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">Duração</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">Status</span>
                            <span />
                        </div>
                        {/* Rows */}
                        {meetings.map((m, idx) => {
                            const status = STATUS_LABELS[m.status] ?? STATUS_LABELS.done;
                            const date = m.createdAt?.toDate?.() ?? new Date();
                            return (
                                <div
                                    key={m.id}
                                    onClick={() => router.push(`/meeting/${m.id}`)}
                                    className={`grid grid-cols-[1fr_160px_100px_110px_32px] gap-4 items-center px-4 py-3 hover:bg-[var(--notion-hover)] cursor-pointer transition-colors ${idx > 0 ? "border-t border-[var(--notion-border)]" : ""}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText size={15} className="text-[var(--notion-text-secondary)] shrink-0" />
                                        <span className="text-[14px] font-medium text-[var(--notion-text)] truncate">
                                            {m.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[13px] text-[var(--notion-text-secondary)]">
                                        <Clock size={12} />
                                        {format(date, "d MMM yyyy, HH:mm", { locale: ptBR })}
                                    </div>
                                    <span className="text-[13px] text-[var(--notion-text-secondary)]">
                                        {formatDuration(m.duration)}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium w-fit ${status.color}`}>
                                        {status.label}
                                    </span>
                                    <ArrowUpRight size={14} className="text-[var(--notion-text-secondary)]" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
