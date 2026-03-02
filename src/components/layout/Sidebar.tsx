"use client";

/**
 * Sidebar — Notion-style collapsible left sidebar.
 * Shows: workspace info, recent meetings list, Nova Reunião button.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    FileText,
    LogOut,
    Settings,
    Mic,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserMeetings, createMeeting, type Meeting } from "@/lib/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!user) return;
        getUserMeetings(user.uid).then(setMeetings);
    }, [user, pathname]); // refetch on route change so list stays fresh

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
        <aside
            className={`sidebar ${collapsed ? "collapsed" : ""} relative flex flex-col h-full border-r border-[var(--notion-border)] bg-[var(--notion-bg-alt)] select-none shrink-0`}
        >
            {/* ── Toggle button ─────────────────────────────────── */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-6 z-10 flex items-center justify-center w-6 h-6 rounded-full border border-[var(--notion-border)] bg-white text-[var(--notion-text-secondary)] hover:text-[var(--notion-text)] hover:bg-[var(--notion-hover)] transition-colors shadow-sm"
                aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            >
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            <div className={`flex-1 flex flex-col overflow-hidden ${collapsed ? "w-0" : "w-[240px]"}`}>
                {/* ── Workspace header ──────────────────────────────── */}
                <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--notion-border)]">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--notion-text)] text-white shrink-0">
                        <Mic size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--notion-text)] truncate leading-tight">
                            {user?.displayName?.split(" ")[0] ?? "Sua conta"}
                        </p>
                        <p className="text-[11px] text-[var(--notion-text-secondary)] truncate">{user?.email}</p>
                    </div>
                </div>

                {/* ── Nova Reunião button ────────────────────────────── */}
                <div className="px-2 pt-3 pb-1">
                    <button
                        onClick={handleNewMeeting}
                        disabled={creating}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[13px] font-medium text-[var(--notion-text-secondary)] hover:bg-[var(--notion-hover)] hover:text-[var(--notion-text)] transition-colors disabled:opacity-50"
                    >
                        <Plus size={15} className="text-[var(--notion-text-secondary)]" />
                        {creating ? "Criando…" : "Nova Reunião"}
                    </button>
                </div>

                {/* ── Meetings list ─────────────────────────────────── */}
                <div className="px-2 pb-2 flex-1 overflow-y-auto">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">
                        Reuniões
                    </p>
                    {meetings.length === 0 ? (
                        <p className="px-2 py-2 text-[13px] text-[var(--notion-text-secondary)]">
                            Nenhuma reunião ainda.
                        </p>
                    ) : (
                        <ul className="space-y-0.5">
                            {meetings.map((m) => {
                                const isActive = pathname === `/meeting/${m.id}`;
                                return (
                                    <li key={m.id}>
                                        <Link
                                            href={`/meeting/${m.id}`}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors truncate ${isActive
                                                    ? "bg-[var(--notion-hover)] text-[var(--notion-text)] font-medium"
                                                    : "text-[var(--notion-text-secondary)] hover:bg-[var(--notion-hover)] hover:text-[var(--notion-text)]"
                                                }`}
                                        >
                                            <FileText size={14} className="shrink-0" />
                                            <span className="truncate">{m.title}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* ── Footer actions ────────────────────────────────── */}
                <div className="px-2 py-2 border-t border-[var(--notion-border)] space-y-0.5">
                    <Link
                        href="/settings"
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-[var(--notion-text-secondary)] hover:bg-[var(--notion-hover)] hover:text-[var(--notion-text)] transition-colors"
                    >
                        <Settings size={14} />
                        Configurações
                    </Link>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[13px] text-[var(--notion-text-secondary)] hover:bg-[var(--notion-hover)] hover:text-[var(--notion-text)] transition-colors"
                    >
                        <LogOut size={14} />
                        Sair
                    </button>
                </div>
            </div>
        </aside>
    );
}
