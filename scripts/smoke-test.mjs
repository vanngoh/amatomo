// Smoke test against the running Firebase emulators (project demo-amatomo).
// Usage: npm run emulators (in another terminal), then npm test.
// Or in one go: npm run test:ci
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, terminate } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

const LINES = {
  line1: "Ama, sudah waktunya makan siang. Mau makan bubur?",
  line2: "好，謝謝你。可是我今天有點頭暈。",
  line3: "Ama sudah minum obat tekanan darah tadi pagi.",
  line4: "Ama pusing dan tidak mau makan. Apa yang harus saya lakukan?",
};
const LANGS = ["zh-TW", "id-ID", "ja-JP"];

const app = initializeApp({ apiKey: "demo-key", projectId: "demo-amatomo", appId: "demo-app" });
const auth = getAuth(app);
const db = getFirestore(app);
const fns = getFunctions(app, "asia-east1");
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectFunctionsEmulator(fns, "127.0.0.1", 5001);

let failures = 0;
function check(cond, label) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failures++;
}
const call = (name, data) => httpsCallable(fns, name)(data).then((r) => r.data);

async function checkMessage(id, label) {
  const snap = await getDoc(doc(db, "rooms", "demo", "messages", id));
  const m = snap.data();
  check(snap.exists(), `${label}: message exists in Firestore`);
  check(LANGS.every((l) => typeof m?.translations?.[l] === "string" && m.translations[l].length > 0), `${label}: has zh-TW, id-ID, ja-JP translations`);
  return m;
}

async function main() {
  const { user } = await signInAnonymously(auth);
  check(!!user.uid, "signed in anonymously");

  // Unauthenticated-style bad input is rejected.
  try {
    await call("sendMessage", { roomId: "demo", senderRole: "caregiver", text: "x".repeat(501), lang: "id-ID" });
    check(false, "rejects input over 500 characters");
  } catch (e) {
    check(String(e.code).includes("invalid-argument"), "rejects input over 500 characters");
  }

  // M1: sendMessage line 1
  const r1 = await call("sendMessage", { roomId: "demo", senderRole: "caregiver", text: LINES.line1, lang: "id-ID" });
  check(typeof r1.id === "string" && typeof r1.mock === "boolean", `sendMessage line 1 returns id + mock (mock=${r1.mock})`);
  const m1 = await checkMessage(r1.id, "line 1");
  check(m1?.isAlert === false, "line 1 is not an alert");
  check(m1?.translations?.["id-ID"] === LINES.line1, "line 1 keeps original text in id-ID");

  // M3: line 2 is an alert
  const r2 = await call("sendMessage", { roomId: "demo", senderRole: "elder", text: LINES.line2, lang: "zh-TW" });
  const m2 = await checkMessage(r2.id, "line 2");
  check(m2?.isAlert === true, "line 2 has isAlert: true");
  check(typeof m2?.alertReason === "string" && m2.alertReason.length > 0, "line 2 has an alertReason");

  // line 3
  const r3 = await call("sendMessage", { roomId: "demo", senderRole: "caregiver", text: LINES.line3, lang: "id-ID" });
  await checkMessage(r3.id, "line 3");

  // M3: care log
  for (const lang of ["zh-TW", "ja-JP"]) {
    const log = await call("generateCareLog", { roomId: "demo", lang });
    check(
      ["meals", "medication", "mood", "summary"].every((k) => typeof log[k] === "string" && log[k].length > 0) && Array.isArray(log.alerts),
      `generateCareLog (${lang}) returns meals/medication/mood/alerts/summary`
    );
    check(log.alerts.length >= 1, `generateCareLog (${lang}) includes the dizziness alert`);
    check(typeof log.mock === "boolean" && /^\d{4}-\d{2}-\d{2}$/.test(log.date), `generateCareLog (${lang}) returns date + mock`);
    const saved = await getDoc(doc(db, "rooms", "demo", "logs", log.date));
    check(saved.exists() && saved.data().lang === lang, `log saved to logs/${log.date} in ${lang}`);
  }

  // M4: coach
  const c = await call("coach", { roomId: "demo", question: LINES.line4, lang: "id-ID" });
  check(typeof c.advice === "string" && c.advice.length > 0, "coach returns advice");
  check(c.shouldEscalate === true, "coach escalates dizziness");
  check(typeof c.mock === "boolean", "coach returns mock flag");
  const cm = await checkMessage(c.id, "coach message");
  check(cm?.senderRole === "coach" && cm?.isAlert === true, "coach message written to feed as an alert");

  console.log(failures ? `\n${failures} check(s) failed` : "\nAll smoke checks passed");
}

main()
  .catch((e) => {
    console.error("Smoke test crashed:", e?.code || "", e?.message || e);
    failures++;
  })
  .finally(async () => {
    await terminate(db).catch(() => {});
    process.exit(failures ? 1 : 0);
  });
