import { httpsCallable } from "firebase/functions";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db, ensureSignedIn, functions, ROOM_ID } from "./firebase";
import type { CareLog, Lang, Role } from "./types";

// Any function response with mock: true turns on the MOCK MODE badge.
type Listener = (mock: boolean) => void;
const listeners = new Set<Listener>();
let mockSeen = false;
export function onMockMode(fn: Listener) {
  listeners.add(fn);
  fn(mockSeen);
  return () => listeners.delete(fn);
}
function noteMock(mock: unknown) {
  if (mock === true && !mockSeen) {
    mockSeen = true;
    listeners.forEach((l) => l(true));
  }
}

async function call<Req, Res extends { mock?: boolean }>(name: string, data: Req): Promise<Res> {
  await ensureSignedIn();
  const res = await httpsCallable<Req, Res>(functions, name)(data);
  noteMock(res.data.mock);
  return res.data;
}

export function sendMessage(senderRole: Role, text: string, lang: Lang) {
  return call<object, { id: string; mock: boolean; isAlert: boolean }>("sendMessage", {
    roomId: ROOM_ID,
    senderRole,
    text,
    lang,
  });
}

export function generateCareLog(lang: Lang) {
  return call<object, CareLog>("generateCareLog", { roomId: ROOM_ID, lang });
}

export function askCoach(question: string, lang: Lang) {
  return call<object, { advice: string; shouldEscalate: boolean; mock: boolean }>("coach", {
    roomId: ROOM_ID,
    question,
    lang,
  });
}

/** Delete every message and log in rooms/demo. */
export async function resetDemo() {
  await ensureSignedIn();
  for (const sub of ["messages", "logs"]) {
    const snap = await getDocs(collection(db, "rooms", ROOM_ID, sub));
    let batch = writeBatch(db);
    let n = 0;
    for (const d of snap.docs) {
      batch.delete(doc(db, "rooms", ROOM_ID, sub, d.id));
      if (++n % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }
    await batch.commit();
  }
}

/** Turn Firebase errors into a short, friendly message. */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  const msg = (e as { message?: string })?.message || String(e);
  if (code.includes("resource-exhausted")) return "Too many requests — please wait a moment.";
  if (code.includes("unauthenticated")) return "Not signed in yet — please reload.";
  if (code.includes("invalid-argument")) return msg;
  if (code.includes("unavailable") || code.includes("internal") || msg.includes("Failed to fetch"))
    return "Can't reach the server. Is it running?";
  if (code.includes("deadline")) return "The server took too long. Please try again.";
  return msg;
}
