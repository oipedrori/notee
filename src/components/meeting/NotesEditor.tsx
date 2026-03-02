"use client";

/**
 * NotesEditor — a distraction-free textarea for manual notes during recording.
 * Auto-saves to Firestore every 3 seconds.
 */
import { useEffect, useRef } from "react";
import { updateMeeting } from "@/lib/firestore";

interface NotesEditorProps {
    value: string;
    onChange: (val: string) => void;
    meetingId: string;
}

export default function NotesEditor({ value, onChange, meetingId }: NotesEditorProps) {
    const saveTimer = useRef<NodeJS.Timeout | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        onChange(newVal);

        // Debounced auto-save
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            updateMeeting(meetingId, { manualNotes: newVal });
        }, 3000);
    };

    // Flush on unmount
    useEffect(() => {
        return () => {
            if (saveTimer.current) {
                clearTimeout(saveTimer.current);
                updateMeeting(meetingId, { manualNotes: value });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--notion-text-secondary)]">
                    Anotações
                </h2>
                <span className="text-[11px] text-[var(--notion-text-secondary)]">
                    Salvo automaticamente
                </span>
            </div>
            <textarea
                id="notes-editor"
                className="notes-editor w-full"
                value={value}
                onChange={handleChange}
                placeholder="Comece a digitar suas anotações aqui...&#10;&#10;Use esse espaço para pontos-chave, decisões, perguntas e qualquer coisa relevante. Suas notas terão peso extra para a IA ao gerar o resumo."
                spellCheck
                autoFocus
                aria-label="Anotações da reunião"
            />
        </div>
    );
}
