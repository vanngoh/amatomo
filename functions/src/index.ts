import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";

import {chatJson, isMockMode} from "./llm";
import {
  CareLog,
  LogMessage,
  mockCareLog,
  mockCoach,
  mockTranslate,
} from "./mockData";
import {
  Lang,
  LANGS,
  LANG_NAMES,
  Role,
  Translations,
  rateLimit,
  requireAuth,
  requireLang,
  requireRoom,
  requireText,
  taipeiTime,
  taipeiToday,
} from "./shared";

setGlobalOptions({region: "asia-east1", maxInstances: 10});
initializeApp();
const db = getFirestore();

const roomRef = (roomId: string) => db.collection("rooms").doc(roomId);

async function ensureRoom(roomId: string) {
  await roomRef(roomId).set(
    {elderName: "Ama", createdAt: FieldValue.serverTimestamp()},
    {merge: true}
  );
}

// ---------- Prompts ----------

const TRANSLATE_PROMPT = `You translate messages in a home-care chat between an elderly person in Taiwan,
a migrant caregiver from Indonesia, and the elder's family.
The elder is a grandmother called Ama (阿嬤, "grandma"). Always write her as
阿嬤 in zh-TW, Ama in id-ID, and おばあちゃん in ja-JP. Never call her 阿公 or おじいちゃん.
Translate the message into zh-TW (Traditional Chinese), id-ID (Bahasa Indonesia),
and ja-JP (Japanese). Keep it natural, warm, and simple. Keep the original
language's text unchanged in its own field.
Also decide if the message mentions a health red flag (dizziness, fall, chest pain,
breathing trouble, confusion, not eating, injury, severe pain).
Return only JSON:
{"translations":{"zh-TW":"","id-ID":"","ja-JP":""},"isAlert":false,"alertReason":null}
alertReason, if any, is a short English phrase.`;

const careLogPrompt = (lang: Lang) =>
  `Summarize today's care-room messages into a daily care log for the family,
written in ${LANG_NAMES[lang]}. Use only facts from the messages. Do not guess.
The elder is a grandmother called Ama (阿嬤, "grandma"). Always write her as
阿嬤 in zh-TW, Ama in id-ID, and おばあちゃん in ja-JP. Never call her 阿公 or おじいちゃん.
Keep every field short. Each alert is one short sentence about Ama's health.
Return only JSON:
{"meals":"","medication":"","mood":"","alerts":[],"summary":""}`;

const ROLE_LABELS: Record<Lang, Record<string, string>> = {
  "zh-TW": {elder: "阿嬤", caregiver: "照護員 Siti", family: "家人"},
  "ja-JP": {elder: "おばあちゃん", caregiver: "介護士 Siti", family: "家族"},
  "id-ID": {elder: "Ama", caregiver: "Siti (caregiver)", family: "Keluarga"},
};

/** Put "1. … 2. … 3. …" steps on separate lines. */
function splitSteps(s: string): string {
  return s.replace(/\s+(?=[2-9][.)．]\s*)/g, "\n").trim();
}

const coachPrompt = (lang: Lang) =>
  `You support a migrant caregiver looking after an elderly person at home.
Reply in ${LANG_NAMES[lang]}, in 3 short, calm, practical steps, numbered 1. 2. 3. Never diagnose or suggest
medication changes. If anything sounds urgent or unsafe, say to contact the family
or a doctor right away and set shouldEscalate to true.
Return only JSON: {"advice":"","shouldEscalate":false}`;

// ---------- Validators ----------

interface TranslateResult {
  translations: Translations;
  isAlert: boolean;
  alertReason: string | null;
}

function validateTranslate(v: unknown): TranslateResult {
  const o = v as Partial<TranslateResult>;
  const t = o?.translations as Partial<Translations> | undefined;
  if (!t || LANGS.some((l) => typeof t[l] !== "string" || !t[l])) {
    throw new Error("missing translations");
  }
  return {
    translations: t as Translations,
    isAlert: o.isAlert === true,
    alertReason:
      o.isAlert === true && typeof o.alertReason === "string" ?
        o.alertReason.slice(0, 120) :
        null,
  };
}

/** Models sometimes return lists or objects where we asked for a string. */
function toText(x: unknown): string {
  if (typeof x === "string") return x.trim();
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  if (Array.isArray(x)) return x.map(toText).filter(Boolean).join("；");
  if (x && typeof x === "object") {
    return Object.values(x).map(toText).filter(Boolean).join("；");
  }
  return "";
}

function validateLog(v: unknown): CareLog {
  const o = v as Record<string, unknown>;
  if (!o || typeof o !== "object") throw new Error("bad log");
  const summary = toText(o.summary);
  if (!summary) throw new Error("missing summary");
  const alerts = Array.isArray(o.alerts) ? o.alerts : o.alerts ? [o.alerts] : [];
  return {
    meals: toText(o.meals) || "—",
    medication: toText(o.medication) || "—",
    mood: toText(o.mood) || "—",
    alerts: alerts.map(toText).filter(Boolean).slice(0, 20),
    summary,
  };
}

function validateCoach(v: unknown): {advice: string; shouldEscalate: boolean} {
  const o = v as {advice?: unknown; shouldEscalate?: unknown};
  let advice = o?.advice;
  if (Array.isArray(advice)) advice = advice.map(String).join("\n");
  if (typeof advice !== "string" || !advice.trim()) {
    throw new Error("missing advice");
  }
  return {advice: advice.trim(), shouldEscalate: o.shouldEscalate === true};
}

// ---------- Core helpers (real LLM with mock fallback) ----------

async function translate(
  text: string,
  lang: Lang
): Promise<TranslateResult & {mock: boolean}> {
  if (!isMockMode()) {
    try {
      const r = await chatJson(
        TRANSLATE_PROMPT,
        `Original language: ${lang}\nMessage: ${text}`,
        validateTranslate,
        700
      );
      r.translations[lang] = text; // keep the original unchanged
      return {...r, mock: false};
    } catch (err) {
      logger.error("translate failed, using mock", {error: String(err)});
    }
  }
  return {...mockTranslate(text, lang), mock: true};
}

// ---------- Callables ----------

export const sendMessage = onCall({timeoutSeconds: 60}, async (req) => {
  requireAuth(req);
  const data = (req.data || {}) as Record<string, unknown>;
  const roomId = requireRoom(data.roomId);
  const lang = requireLang(data.lang);
  const text = requireText(data.text);
  const senderRole = data.senderRole as Role;
  if (!["elder", "caregiver", "family"].includes(senderRole)) {
    throw new HttpsError("invalid-argument", "Invalid senderRole.");
  }
  rateLimit(roomId);

  const r = await translate(text, lang);
  await ensureRoom(roomId);
  const msg = {
    senderRole,
    originalText: text,
    originalLang: lang,
    translations: r.translations,
    isAlert: r.isAlert,
    alertReason: r.alertReason,
    mock: r.mock,
    createdAt: FieldValue.serverTimestamp(),
  };
  const ref = await roomRef(roomId).collection("messages").add(msg);
  return {
    id: ref.id,
    ...msg,
    createdAt: new Date().toISOString(),
    mock: r.mock,
  };
});

export const generateCareLog = onCall({timeoutSeconds: 60}, async (req) => {
  requireAuth(req);
  const data = (req.data || {}) as Record<string, unknown>;
  const roomId = requireRoom(data.roomId);
  const lang = requireLang(data.lang);
  rateLimit(roomId);

  const {date, start} = taipeiToday();
  const snap = await roomRef(roomId)
    .collection("messages")
    .where("createdAt", ">=", Timestamp.fromDate(start))
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();

  const messages: LogMessage[] = snap.docs.map((d) => {
    const m = d.data();
    const created = (m.createdAt as Timestamp | undefined)?.toDate() ||
      new Date();
    return {
      senderRole: String(m.senderRole),
      originalText: String(m.originalText || ""),
      translations: (m.translations || {}) as Translations,
      isAlert: m.isAlert === true,
      time: taipeiTime(created),
    };
  });

  let log: CareLog | null = null;
  let mock = true;
  if (!isMockMode() && messages.length) {
    try {
      // Coach advice is guidance, not a fact about Ama, so leave it out.
      const transcript = messages
        .filter((m) => m.senderRole !== "coach")
        .map(
          (m) =>
            `[${m.time}] ${ROLE_LABELS[lang][m.senderRole] || m.senderRole}` +
            `${m.isAlert ? " (ALERT)" : ""}: ` +
            `${m.translations[lang] || m.originalText}`
        )
        .join("\n");
      log = await chatJson(
        careLogPrompt(lang),
        `Today's messages (${date}, Asia/Taipei):\n${transcript}`,
        validateLog,
        800
      );
      mock = false;
    } catch (err) {
      logger.error("care log failed, using mock", {error: String(err)});
    }
  }
  if (!log) log = mockCareLog(messages, lang);

  const doc = {lang, ...log, createdAt: FieldValue.serverTimestamp()};
  await ensureRoom(roomId);
  await roomRef(roomId).collection("logs").doc(date).set(doc);
  return {
    date,
    lang,
    ...log,
    messageCount: messages.length,
    mock,
  };
});

export const coach = onCall({timeoutSeconds: 90}, async (req) => {
  requireAuth(req);
  const data = (req.data || {}) as Record<string, unknown>;
  const roomId = requireRoom(data.roomId);
  const lang = requireLang(data.lang);
  const question = requireText(data.question, "question");
  rateLimit(roomId);

  let translations: Translations | null = null;
  let advice = "";
  let shouldEscalate = false;
  let mock = true;

  if (!isMockMode()) {
    try {
      const r = await chatJson(
        coachPrompt(lang),
        `Caregiver's question: ${question}`,
        validateCoach,
        600
      );
      advice = splitSteps(r.advice);
      shouldEscalate = r.shouldEscalate;
      const t = await translate(advice, lang);
      translations = t.translations;
      for (const l of LANGS) translations[l] = splitSteps(translations[l]);
      mock = t.mock;
    } catch (err) {
      logger.error("coach failed, using mock", {error: String(err)});
    }
  }
  if (!translations) {
    const m = mockCoach(question);
    translations = m.translations;
    advice = m.translations[lang];
    shouldEscalate = m.shouldEscalate;
    mock = true;
  }

  await ensureRoom(roomId);
  const msg = {
    senderRole: "coach" as Role,
    originalText: advice,
    originalLang: lang,
    translations,
    question,
    isAlert: shouldEscalate,
    alertReason: shouldEscalate ?
      "Coach escalated a caregiver concern" :
      null,
    mock,
    createdAt: FieldValue.serverTimestamp(),
  };
  const ref = await roomRef(roomId).collection("messages").add(msg);
  return {id: ref.id, advice, shouldEscalate, mock};
});
