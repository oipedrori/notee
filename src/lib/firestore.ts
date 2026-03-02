/**
 * Firestore client-side helpers (browser only).
 * Uses the lazy Firebase client SDK singleton.
 * Server-side code (API routes) should use firebase-admin.ts.
 */
import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { getClientDb } from "./firebase";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MeetingStatus = "recording" | "processing" | "done" | "error";

export interface Meeting {
    id: string;
    userId: string;
    title: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: MeetingStatus;
    tags: string[];
    duration: number;
    audioStoragePath: string;
    manualNotes: string;
}

export interface AIResults {
    transcript: string;
    summary: string;
    actionItems: { text: string; done: boolean }[];
    generatedAt: Timestamp;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Timestamp;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(userId: string, data: { email: string; displayName: string }) {
    const db = getClientDb();
    await setDoc(doc(db, "users", userId), { ...data, createdAt: serverTimestamp() }, { merge: true });
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export async function createMeeting(userId: string): Promise<string> {
    const db = getClientDb();
    const ref = await addDoc(collection(db, "meetings"), {
        userId,
        title: "Reunião sem título",
        status: "recording" as MeetingStatus,
        tags: [],
        duration: 0,
        audioStoragePath: "",
        manualNotes: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
    const db = getClientDb();
    const snap = await getDoc(doc(db, "meetings", meetingId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Meeting;
}

export async function getUserMeetings(userId: string): Promise<Meeting[]> {
    const db = getClientDb();
    // Sorting client-side to avoid needing a Firestore composite index
    const q = query(
        collection(db, "meetings"),
        where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Meeting))
        .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime; // newest first
        });
}


export async function updateMeeting(meetingId: string, data: Partial<Omit<Meeting, "id">>) {
    const db = getClientDb();
    await updateDoc(doc(db, "meetings", meetingId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteMeeting(meetingId: string) {
    const db = getClientDb();
    await deleteDoc(doc(db, "meetings", meetingId));
}

// ─── AI Results ───────────────────────────────────────────────────────────────

export async function saveAIResults(meetingId: string, results: Omit<AIResults, "generatedAt">) {
    const db = getClientDb();
    await setDoc(doc(db, "meetings", meetingId, "aiResults", "main"), {
        ...results,
        generatedAt: serverTimestamp(),
    });
}

export async function getAIResults(meetingId: string): Promise<AIResults | null> {
    const db = getClientDb();
    const snap = await getDoc(doc(db, "meetings", meetingId, "aiResults", "main"));
    if (!snap.exists()) return null;
    return snap.data() as AIResults;
}

export async function toggleActionItem(meetingId: string, index: number, done: boolean) {
    const results = await getAIResults(meetingId);
    if (!results) return;
    const db = getClientDb();
    const actionItems = results.actionItems.map((item, i) =>
        i === index ? { ...item, done } : item
    );
    await updateDoc(doc(db, "meetings", meetingId, "aiResults", "main"), { actionItems });
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function saveChatMessage(
    meetingId: string,
    message: Omit<ChatMessage, "id" | "createdAt">
) {
    const db = getClientDb();
    await addDoc(collection(db, "meetings", meetingId, "chatMessages"), {
        ...message,
        createdAt: serverTimestamp(),
    });
}

export async function getChatMessages(meetingId: string): Promise<ChatMessage[]> {
    const db = getClientDb();
    const q = query(
        collection(db, "meetings", meetingId, "chatMessages"),
        orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
}
