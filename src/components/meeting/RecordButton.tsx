"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Square, Monitor, ChevronDown } from "lucide-react";
import { useAudioRecorder, type RecordingMode } from "@/hooks/useAudioRecorder";

interface RecordButtonProps {
    meetingId: string;
    onStop: (blob: Blob, durationSec: number) => void;
}

function formatTime(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecordButton({ onStop }: RecordButtonProps) {
    const { isRecording, duration, audioBlob, error, startRecording, stopRecording } =
        useAudioRecorder();
    const [mode, setMode] = useState<RecordingMode>("microphone");
    const [showSourceMenu, setShowSourceMenu] = useState(false);
    const durationAtStop = useRef(0);

    // Keep track of duration while recording so we have it when recording stops
    useEffect(() => {
        if (isRecording) durationAtStop.current = duration;
    }, [duration, isRecording]);

    // When audioBlob becomes available after recording ends, call onStop
    useEffect(() => {
        if (audioBlob && !isRecording) {
            onStop(audioBlob, durationAtStop.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioBlob]);

    const handleToggle = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording(mode);
        }
    };

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {/* Main record / stop button */}
            <button
                onClick={handleToggle}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${isRecording
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : "bg-[var(--notion-text)] text-white hover:opacity-90"
                    }`}
                aria-label={isRecording ? "Parar gravação" : "Iniciar gravação"}
            >
                {isRecording ? (
                    <>
                        <span className="recording-dot w-2 h-2 rounded-full bg-red-500 inline-block" />
                        <Square size={14} />
                        Parar — {formatTime(duration)}
                    </>
                ) : (
                    <>
                        <Mic size={14} />
                        Gravar
                    </>
                )}
            </button>

            {/* Source selector (only when not recording) */}
            {!isRecording && (
                <div className="relative">
                    <button
                        onClick={() => setShowSourceMenu((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--notion-border)] text-[13px] text-[var(--notion-text-secondary)] hover:bg-[var(--notion-hover)] transition-colors"
                        aria-label="Escolher fonte de áudio"
                    >
                        {mode === "microphone" ? <Mic size={13} /> : <Monitor size={13} />}
                        {mode === "microphone" ? "Microfone" : "Aba / Sistema"}
                        <ChevronDown size={11} />
                    </button>
                    {showSourceMenu && (
                        <div className="absolute top-10 left-0 z-20 w-44 bg-white border border-[var(--notion-border)] rounded-xl shadow-lg py-1 text-[13px]">
                            <button
                                onClick={() => { setMode("microphone"); setShowSourceMenu(false); }}
                                className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--notion-hover)] transition-colors ${mode === "microphone" ? "text-[var(--notion-text)] font-medium" : "text-[var(--notion-text-secondary)]"}`}
                            >
                                <Mic size={13} /> Microfone
                            </button>
                            <button
                                onClick={() => { setMode("screen"); setShowSourceMenu(false); }}
                                className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--notion-hover)] transition-colors ${mode === "screen" ? "text-[var(--notion-text)] font-medium" : "text-[var(--notion-text-secondary)]"}`}
                            >
                                <Monitor size={13} /> Aba / Sistema
                                <span className="ml-auto text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Chrome</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Error message */}
            {error && (
                <p className="text-[13px] text-red-600 mt-1 w-full">{error}</p>
            )}
        </div>
    );
}
