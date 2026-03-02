"use client";

/**
 * TranscriptAccordion — collapsible full transcript section.
 * Hidden by default to keep the page clean; expands with a smooth animation.
 */
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getAIResults } from "@/lib/firestore";

interface TranscriptAccordionProps {
    meetingId: string;
}

export default function TranscriptAccordion({ meetingId }: TranscriptAccordionProps) {
    const [open, setOpen] = useState(false);
    const [transcript, setTranscript] = useState<string | null>(null);

    useEffect(() => {
        getAIResults(meetingId).then((r) => {
            if (r) setTranscript(r.transcript);
        });
    }, [meetingId]);

    if (!transcript) return null;

    return (
        <div className="border border-[var(--notion-border)] rounded-xl overflow-hidden">
            {/* Toggle header */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-[var(--notion-hover)] transition-colors"
                aria-expanded={open}
            >
                {open ? (
                    <ChevronDown size={15} className="text-[var(--notion-text-secondary)]" />
                ) : (
                    <ChevronRight size={15} className="text-[var(--notion-text-secondary)]" />
                )}
                <span className="text-[13px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">
                    Transcrição Completa
                </span>
            </button>

            {/* Content */}
            <div className={`accordion-content ${open ? "open" : ""}`}>
                <div className="px-4 pt-2 pb-4 border-t border-[var(--notion-border)]">
                    <pre className="whitespace-pre-wrap text-[13px] leading-[1.75] text-[var(--notion-text)] font-mono overflow-auto">
                        {transcript}
                    </pre>
                </div>
            </div>
        </div>
    );
}
