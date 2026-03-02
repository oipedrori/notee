/**
 * useAudioRecorder — custom hook that wraps the browser MediaRecorder API.
 *
 * Supports two modes:
 *   - "microphone": captures the user's mic via getUserMedia
 *   - "screen":     captures tab/system audio via getDisplayMedia
 *
 * Returns:
 *   isRecording, startRecording(mode), stopRecording, audioBlob, duration, error
 *
 * The audio is encoded as audio/webm;codecs=opus (best cross-browser support).
 * After stopping, blobToBase64() is available for inline Gemini API submission.
 */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingMode = "microphone" | "screen";

export interface UseAudioRecorderResult {
    isRecording: boolean;
    duration: number;       // seconds elapsed
    audioBlob: Blob | null;
    error: string | null;
    startRecording: (mode?: RecordingMode) => Promise<void>;
    stopRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderResult {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const startRecording = useCallback(async (mode: RecordingMode = "microphone") => {
        setError(null);
        setAudioBlob(null);
        chunksRef.current = [];

        try {
            let stream: MediaStream;

            if (mode === "screen") {
                // Request screen share; we only want the audio track.
                // Note: some browsers (Firefox/Safari) don't support audio-only getDisplayMedia.
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,  // required by spec even if we don't use video
                    audio: true,
                });

                // Extract only audio tracks; drop video to save memory
                const audioTracks = displayStream.getAudioTracks();
                if (audioTracks.length === 0) {
                    displayStream.getTracks().forEach((t) => t.stop());
                    throw new Error(
                        "Nenhuma trilha de áudio detectada. Certifique-se de marcar 'Compartilhar áudio' no diálogo do navegador."
                    );
                }
                stream = new MediaStream(audioTracks);

                // Stop the video track immediately to avoid showing a red recording dot
                displayStream.getVideoTracks().forEach((t) => t.stop());
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            streamRef.current = stream;

            // Prefer webm/opus; fallback to whatever the browser supports
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "";

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || "audio/webm",
                });
                setAudioBlob(blob);
                stream.getTracks().forEach((t) => t.stop());
            };

            recorder.start(1000); // collect data every 1 second
            setIsRecording(true);
            setDuration(0);

            // Tick a timer
            timerRef.current = setInterval(() => {
                setDuration((d) => d + 1);
            }, 1000);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro ao acessar o microfone.";
            setError(msg);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }, []);

    return { isRecording, duration, audioBlob, error, startRecording, stopRecording };
}

/** Converts a Blob to a base64-encoded string (data URL stripped). */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Strip the "data:audio/webm;base64," prefix
            resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
