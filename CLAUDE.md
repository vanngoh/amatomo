# CLAUDE.md: Build AmaTomo autonomously

You are building **AmaTomo** alone. The human is busy setting up the Firebase project and API keys and **will not answer questions**. Build every milestone in order without stopping, test each one yourself, commit, and keep `PROGRESS.md` updated so the human can check in at any time.

This file is the single source of truth. If `plan.md` or `dev-plan.md` exist, this file takes priority.

---

## 1. Operating rules
1. **Never wait for the human.** Don't ask questions. When something is unclear, choose the simplest reasonable option, note it in `PROGRESS.md` under "Decisions," and continue.
2. **Never block on secrets.** If Firebase config or `GMI_API_KEY` is missing, use the placeholder project and mock mode (section 4). Never ask for keys, never print them, never commit them.
3. **Never run** `firebase login`, `firebase use`, `firebase deploy`, or anything that touches a real cloud project. The human deploys.
4. **Work milestone by milestone** (section 9). After each one: run its checks, fix failures, update `PROGRESS.md`, and `git commit`. Then go straight to the next milestone.
5. **Timebox problems.** If stuck for about 10 minutes, use a simpler approach or fallback, log it under "Known issues," and move on.
6. **Simple code over clever code.** This is a 4-hour hackathon demo. No extra libraries unless they clearly save time.
7. **Stay in scope.** Build nothing outside this file.

---

## 2. Product
A shared "care room" for three people who speak different languages:
- **Elder (Ama):** speaks Mandarin (`zh-TW`) and uses a tablet.
- **Caregiver (Siti):** a migrant caregiver who speaks Bahasa Indonesia (`id-ID`) and uses a phone.
- **Family (daughter):** reads Traditional Chinese (`zh-TW`) or Japanese (`ja-JP`) and uses a phone.

AI translates every message into each person's language, speaks incoming messages aloud, flags health red flags to the family, writes a daily care log, and coaches the caregiver.

**The demo story (this defines "done"):**
1. The caregiver says line 1 in Indonesian. The elder tablet shows it and speaks it in Mandarin.
2. The elder says line 2 in Mandarin ("I feel a bit dizzy"). The caregiver hears Indonesian, and a **red alert** appears on the family phone.
3. The caregiver says line 3 (medication taken).
4. The family taps **Today's Log** and sees meals, medication, mood, and alerts.
5. The caregiver asks the **Coach** line 4 and gets advice in Indonesian.
6. The family switches to **Japanese**, and the feed and log show in Japanese.

**Demo lines:**
| # | Role | Lang | Text | English |
|---|---|---|---|---|
| 1 | caregiver | id-ID | Ama, sudah waktunya makan siang. Mau makan bubur? | Grandma, it's lunchtime. Would you like porridge? |
| 2 | elder | zh-TW | 好，謝謝你。可是我今天有點頭暈。 | OK, thank you. But I feel a bit dizzy today. |
| 3 | caregiver | id-ID | Ama sudah minum obat tekanan darah tadi pagi. | Grandma took her blood pressure medicine this morning. |
| 4 | caregiver → coach | id-ID | Ama pusing dan tidak mau makan. Apa yang harus saya lakukan? | Grandma is dizzy and won't eat. What should I do? |

---

## 3. Tech stack and structure
- **Frontend:** Vite + React + TypeScript in `/web`. Firebase Web SDK (modular).
- **Backend:** Firebase Cloud Functions v2 (callable), TypeScript, Node 20, in `/functions`. Region **`asia-east1`** (Taiwan) for every function, and the web client must call the same region.
- **Database:** Firestore with `onSnapshot` live listeners.
- **Auth:** Firebase Anonymous Auth, signed in automatically on load. No login UI.
- **Hosting:** Firebase Hosting serving `web/dist` with an SPA rewrite to `/index.html`.
- **Speech:** browser Web Speech API only (`SpeechRecognition` or `webkitSpeechRecognition`, and `speechSynthesis`).
- **LLM:** GMI Cloud through an OpenAI-compatible Chat Completions endpoint: `POST {GMI_BASE_URL}/chat/completions` with `Authorization: Bearer {GMI_API_KEY}` and `model: {GMI_MODEL}`. Put all LLM code in `functions/src/llm.ts` so the endpoint is easy to adjust. Use low temperature, ask for JSON only, strip code fences before parsing, validate, and retry once on failure.

```
/
├─ CLAUDE.md
├─ PROGRESS.md
├─ README.md
├─ firebase.json
├─ .firebaserc            # "demo-amatomo" placeholder
├─ firestore.rules
├─ firestore.indexes.json
├─ package.json           # root scripts
├─ scripts/smoke-test.mjs
├─ web/                   # Vite app (.env.example committed, .env.local ignored)
└─ functions/             # Cloud Functions (.env.example committed, .env ignored)
```

**Root npm scripts:**
- `dev`: starts the Firebase emulators (Auth, Firestore, Functions, Hosting optional) and the Vite dev server together.
- `build`: builds functions and web.
- `test`: runs `scripts/smoke-test.mjs` against running emulators.
- `deploy`: runs build, then `firebase deploy` (the human runs this, never you).

---

## 4. Config, placeholder project, and mock mode
**Placeholder project:** `.firebaserc` uses `demo-amatomo`. Projects starting with `demo-` run fully on the emulators without a real Firebase project.

**Web config:** read `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. If they're missing, fall back to `{ apiKey: "demo-key", authDomain: "demo-amatomo.firebaseapp.com", projectId: "demo-amatomo", appId: "demo-app" }`. When `location.hostname` is `localhost` or `127.0.0.1`, connect Auth, Firestore, and Functions to the emulators.

**Functions config:** read `GMI_API_KEY`, `GMI_BASE_URL`, `GMI_MODEL` from `functions/.env`.

**Mock mode** (when `GMI_API_KEY` is empty), so everything works and the demo still looks right without a key:
- **Translations:** if the text matches a demo line, return its real translations (write zh-TW, id-ID, and ja-JP versions of all 4 lines into a `mockData.ts` file yourself). Otherwise return the original text prefixed with `[mock]` for each language.
- **Alerts:** `isAlert: true` if the text contains 頭暈, 暈, pusing, dizzy, 跌倒, jatuh, 胸痛, or sakit dada.
- **Care log:** build it from today's messages with simple keyword rules.
- **Coach:** return fixed, sensible 3-step advice in the requested language, with `shouldEscalate: true` when dizziness is mentioned.
- Show a small "MOCK MODE" badge in the UI whenever any function response says `mock: true`.

**Switching to the real project needs config only, never code changes.** Document the steps in the README (section 11).

---

## 5. Data model (Firestore)
```
rooms/demo
  elderName: "Ama"
  createdAt: timestamp

rooms/demo/messages/{id}
  senderRole: "elder" | "caregiver" | "family" | "coach"
  originalText: string
  originalLang: "zh-TW" | "id-ID" | "ja-JP"
  translations: { "zh-TW": string, "id-ID": string, "ja-JP": string }
  isAlert: boolean
  alertReason: string | null
  createdAt: serverTimestamp

rooms/demo/logs/{yyyy-mm-dd in Asia/Taipei}
  lang, meals, medication, mood, alerts: string[], summary, createdAt
```
**firestore.rules:** signed-in users can read and write `rooms/demo` and its subcollections. Deny everything else.

---

## 6. Cloud Functions (callable, region asia-east1)
Every function: requires auth, rejects input over 500 characters, caps output tokens, applies a simple per-room limit (about 30 calls per minute, tracked in memory or Firestore), and returns `mock: boolean`.

1. **`sendMessage({ roomId, senderRole, text, lang })`**: one LLM call for translations and alert detection, then writes the message and returns it.
2. **`generateCareLog({ roomId, lang })`**: reads today's messages (Asia/Taipei date), generates the log, writes it to `logs/{date}`, and returns it.
3. **`coach({ roomId, question, lang })`**: generates advice, writes it to the feed as a `coach` message with translations, and returns `{ advice, shouldEscalate }`. If `shouldEscalate` is true, also mark that message as an alert so the family sees it.

**Prompts (system messages; all replies are JSON only):**

sendMessage:
```
You translate messages in a home-care chat between an elderly person in Taiwan,
a migrant caregiver from Indonesia, and the elder's family.
Translate the message into zh-TW (Traditional Chinese), id-ID (Bahasa Indonesia),
and ja-JP (Japanese). Keep it natural, warm, and simple. Keep the original
language's text unchanged in its own field.
Also decide if the message mentions a health red flag (dizziness, fall, chest pain,
breathing trouble, confusion, not eating, injury, severe pain).
Return only JSON:
{"translations":{"zh-TW":"","id-ID":"","ja-JP":""},"isAlert":false,"alertReason":null}
alertReason, if any, is a short English phrase.
```

generateCareLog:
```
Summarize today's care-room messages into a daily care log for the family,
written in {lang}. Use only facts from the messages. Do not guess.
Return only JSON:
{"meals":"","medication":"","mood":"","alerts":[],"summary":""}
```

coach:
```
You support a migrant caregiver looking after an elderly person at home.
Reply in {lang}, in 3 short, calm, practical steps. Never diagnose or suggest
medication changes. If anything sounds urgent or unsafe, say to contact the family
or a doctor right away and set shouldEscalate to true.
Return only JSON: {"advice":"","shouldEscalate":false}
```

---

## 7. UI
Warm, calm, high-contrast design. Mobile-first. No UI library needed. System fonts plus Noto Sans TC if convenient.

**Routes:**
- `/`: a simple landing page with the AmaTomo name and tagline ("One care team, every language") and links to the three roles and the demo view.
- `/room/demo?role=elder`: tablet layout. Very large text (about 28px or more), one huge mic button, a feed in zh-TW, incoming messages auto-spoken in zh-TW, and a quick-line button for line 2.
- `/room/demo?role=caregiver`: phone layout. Mic button, feed in id-ID, auto-speak toggle, **Coach** button (opens an input with a quick-line for line 4), and quick-line buttons for lines 1 and 3.
- `/room/demo?role=family`: phone layout. Red alert banners pinned at the top, a feed in zh-TW or ja-JP, a **ZH/JA toggle**, and a **Today's Log** button that shows the log as a card.
- `/demo`: a **recording view** showing all three roles side by side in device frames (tablet, phone, phone) using same-origin iframes with `allow="microphone; autoplay"`, plus a **Reset demo** button that deletes all messages and logs in `rooms/demo`. This is how the solo human records the video.

**Feed messages:** show the sender role (with a small icon and label), the text in the viewer's language, and a small "original" line underneath. Coach messages get a distinct style.

**Speech behavior:**
- Mic: tap to start and stop. Set recognition `lang` from the role. On the final result, call `sendMessage`. Show the interim transcript while speaking.
- Auto-speak: speak incoming messages from other roles in the viewer's language, choosing a voice that matches the language. Show a **"Tap to enable sound"** button first, since browsers block audio until the user interacts.
- If speech recognition is unsupported, hide the mic and keep text input and quick lines working.

**Always available:** a text input on every role, as a fallback.

---

## 8. Testing (you can't use a mic, so test everything else)
- After every milestone: TypeScript compiles and `npm run build` succeeds.
- `scripts/smoke-test.mjs` (Node, Firebase client SDK pointed at the emulators): signs in anonymously, calls `sendMessage` with lines 1 and 2, checks that the messages exist in Firestore with all three translations and that line 2 has `isAlert: true`, then calls `generateCareLog` and `coach` and checks their response shapes. It must pass in mock mode.
- Start the emulators yourself in the background to run the smoke test, and stop them afterward.
- Voice can't be auto-tested. List the manual voice checks in `PROGRESS.md` for the human.

---

## 9. Milestones (build in order without stopping)
**M0: Scaffold.** Repo structure, configs, placeholder project, emulators, env examples, `.gitignore` (all `.env*` except `.env.example`, `node_modules`, `dist`, emulator data), root scripts, `PROGRESS.md`, README skeleton. Run `git init` if needed.
Check: build succeeds and the emulators start.

**M1: Room and translated feed.** Anonymous auth, role routes, `sendMessage` (real and mock), live feed in each viewer's language, text input, MOCK MODE badge.
Check: smoke test for `sendMessage` passes.

**M2: Voice and quick lines.** Mic input, auto-speak with the sound unlock button, and quick-line buttons per role.
Check: build succeeds. Add manual voice checks to `PROGRESS.md`.

**M3: Alerts and care log.** Family alert banners and `generateCareLog` with the log card.
Check: smoke test covers the alert and the log.

**M4: Coach and Japanese.** The coach function and UI, escalation becomes an alert, and the family ZH/JA toggle (re-render the feed and regenerate the log in ja-JP).
Check: smoke test covers the coach.

**M5: Recording view and polish.** The `/demo` side-by-side view, Reset demo button, landing page, visual polish, loading states, and friendly error messages.
Check: build succeeds and the full smoke test passes.

**M6: Docs and handoff.** Finish the README (section 11) and the final `PROGRESS.md` handoff.

Commit messages: `m0-scaffold`, `m1-feed`, `m2-voice`, `m3-alerts-log`, `m4-coach-ja`, `m5-demo-view`, `m6-docs`. If a git remote is configured, push after each commit. Otherwise just commit.

---

## 10. PROGRESS.md (keep it current)
```
# AmaTomo progress
Status: <current milestone, or "DONE: ready for human">
Mode: MOCK (no GMI key detected) | REAL

## Milestones
- [x] M0 scaffold: ...
- [ ] M1 ...

## How to run locally
...

## Manual checks for the human (voice and devices)
- [ ] ...

## Decisions
- ...

## Known issues
- ...
```

---

## 11. README.md must include
- What AmaTomo does (2–3 sentences) and the name's meaning: 阿嬤 *a-má* (Taiwanese "grandma") + 友 *tomo* (Japanese "friend").
- An architecture diagram (a Mermaid block).
- How to run locally (`npm install`, `npm run dev`, open `/demo`).
- **Switch to the real project** (config only):
  1. Create the Firebase project, choosing **asia-east1** for Firestore. Turn on Firestore, Anonymous Auth, and the Blaze plan.
  2. Run `firebase use --add` and select the project.
  3. Register a web app and copy its config into `web/.env.local` as `VITE_FIREBASE_*`.
  4. Put `GMI_API_KEY`, `GMI_BASE_URL`, `GMI_MODEL` in `functions/.env`.
  5. Run `npm run deploy` and open the Hosting URL.
- **Privacy:** no audio is stored, data stays in the room, consent is required.
- **Safety:** the coach never diagnoses and always escalates red flags to family or a doctor.
- **Roadmap:** Taiwanese Hokkien speech, a dedicated elder device, and Japan's care facilities.

---

## 12. Out of scope
Login and signup screens, multiple rooms, settings pages, storing audio, Hokkien speech recognition, native apps, payments, analytics.

## 13. When everything is done
Set `PROGRESS.md` status to **"DONE: ready for human"** and end with a short summary of what works, what's mocked, the manual checks to do, and the exact commands to switch to the real project and deploy.
