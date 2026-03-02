/**
 * Firebase Storage helper — uploads audio blob and returns the storage path.
 */
import { ref, uploadBytes } from "firebase/storage";
import { getClientStorage } from "./firebase";

export async function uploadAudio(meetingId: string, blob: Blob): Promise<string> {
    const storage = getClientStorage();
    const ext = blob.type.includes("ogg") ? "ogg" : "webm";
    const path = `audio/${meetingId}/recording.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: blob.type });
    return path;
}
