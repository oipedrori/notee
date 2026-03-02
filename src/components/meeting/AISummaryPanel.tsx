"use client";

/**
 * AISummaryPanel — displays AI-generated summary and action items.
 * Action items have toggleable checkboxes that persist to Firestore.
 */
import { useEffect, useState } from "react";
import { CheckSquare, Square, Sparkles, Loader2 } from "lucide-react";
import { getAIResults, toggleActionItem, type AIResults } from "@/lib/firestore";

interface AISummaryPanelProps {
    meetingId: string;
}

export default function AISummaryPanel({ meetingId }: AISummaryPanelProps) {
    const [results, setResults] = useState<AIResults | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAIResults(meetingId)
            .then(setResults)
            .finally(() => setLoading(false));
    }, [meetingId]);

    const handleToggle = async (index: number, done: boolean) => {
        if (!results) return;
        // Optimistic update
        setResults({
            ...results,
            actionItems: results.actionItems.map((item, i) =>
                i === index ? { ...item, done } : item
            ),
        });
        await toggleActionItem(meetingId, index, done);
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-[var(--notion-text-secondary)]">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[14px]">Carregando resultado da IA…</span>
            </div>
        );
    }

    if (!results) return null;

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={15} className="text-[var(--notion-text-secondary)]" />
                    <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">
                        Resumo da IA
                    </h2>
                </div>
                <div className="text-[15px] leading-[1.75] text-[var(--notion-text)] whitespace-pre-wrap bg-[var(--notion-bg-alt)] rounded-xl px-4 py-4 border border-[var(--notion-border)]">
                    {results.summary}
                </div>
            </div>

            {/* Action items */}
            {results.actionItems.length > 0 && (
                <div>
                    <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)] mb-3">
                        Action Items
                    </h2>
                    <ul className="space-y-2">
                        {results.actionItems.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-3 text-[15px] text-[var(--notion-text)] group"
                            >
                                <button
                                    onClick={() => handleToggle(i, !item.done)}
                                    className="mt-0.5 shrink-0 text-[var(--notion-text-secondary)] hover:text-[var(--notion-text)] transition-colors"
                                    aria-label={item.done ? "Marcar como pendente" : "Marcar como concluído"}
                                >
                                    {item.done ? (
                                        <CheckSquare size={17} className="text-green-600" />
                                    ) : (
                                        <Square size={17} />
                                    )}
                                </button>
                                <span className={item.done ? "line-through text-[var(--notion-text-secondary)]" : ""}>
                                    {item.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
