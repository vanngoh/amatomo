import {HttpsError, CallableRequest} from "firebase-functions/v2/https";

export const LANGS = ["zh-TW", "id-ID", "ja-JP"] as const;
export type Lang = (typeof LANGS)[number];
export const ROLES = ["elder", "caregiver", "family", "coach"] as const;
export type Role = (typeof ROLES)[number];
export type Translations = Record<Lang, string>;

export const MAX_INPUT = 500;
export const ROOM_ID = "demo";

export const LANG_NAMES: Record<Lang, string> = {
  "zh-TW": "Traditional Chinese (zh-TW, Taiwan)",
  "id-ID": "Bahasa Indonesia (id-ID)",
  "ja-JP": "Japanese (ja-JP)",
};

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

/** Common checks for every callable: auth, room, text length. */
export function requireAuth(req: CallableRequest<unknown>): void {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Please sign in first.");
  }
}

export function requireRoom(roomId: unknown): string {
  if (roomId !== ROOM_ID) {
    throw new HttpsError("invalid-argument", "Unknown room.");
  }
  return roomId;
}

export function requireLang(lang: unknown): Lang {
  if (!isLang(lang)) {
    throw new HttpsError("invalid-argument", "Unsupported language.");
  }
  return lang;
}

export function requireText(text: unknown, field = "text"): string {
  if (typeof text !== "string" || !text.trim()) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  const t = text.trim();
  if (t.length > MAX_INPUT) {
    throw new HttpsError(
      "invalid-argument",
      `${field} is too long (max ${MAX_INPUT} characters).`
    );
  }
  return t;
}

// Simple in-memory per-room rate limit (~30 calls/minute per instance).
const calls = new Map<string, number[]>();
export function rateLimit(roomId: string, max = 30, windowMs = 60_000): void {
  const now = Date.now();
  const recent = (calls.get(roomId) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many requests. Please wait a moment."
    );
  }
  recent.push(now);
  calls.set(roomId, recent);
}

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Today's date (yyyy-mm-dd) in Asia/Taipei and the UTC Date of its midnight. */
export function taipeiToday(now = new Date()): {date: string; start: Date} {
  const shifted = new Date(now.getTime() + TAIPEI_OFFSET_MS);
  const date = shifted.toISOString().slice(0, 10);
  const start = new Date(Date.parse(`${date}T00:00:00Z`) - TAIPEI_OFFSET_MS);
  return {date, start};
}

/** HH:mm in Asia/Taipei. */
export function taipeiTime(d: Date): string {
  return new Date(d.getTime() + TAIPEI_OFFSET_MS).toISOString().slice(11, 16);
}

/**
 * The language a message is really written in. People sometimes type in a
 * language other than their app setting (e.g. family toggled to 中 but typing
 * Japanese), so trust the script over the setting: kana means Japanese,
 * Han characters mean Chinese (or Japanese if that was the setting), and
 * Latin letters mean Indonesian.
 */
export function detectLang(text: string, declared: Lang): Lang {
  if (/[぀-ヿ]/.test(text)) return "ja-JP";
  if (/[㐀-鿿]/.test(text)) return declared === "ja-JP" ? "ja-JP" : "zh-TW";
  if (/[A-Za-z]/.test(text)) return "id-ID";
  return declared;
}
