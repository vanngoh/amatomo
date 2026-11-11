# AmaTomo progress
Status: M6 docs and handoff (deploying to amatomodemo)
Mode: MOCK (functions/.env has a placeholder GMI_API_KEY)

## Milestones
- [x] M0 scaffold: firebase.json (merged with the human's `firebase init`), `.firebaserc` (default `amatomodemo`, alias `demo` → `demo-amatomo`), rules, env examples, root scripts, emulators start.
- [x] M1 feed: anonymous auth, role routes, `sendMessage` (real + mock), live feed per viewer language, text input, MOCK MODE badge.
- [x] M2 voice: mic (tap start/stop, interim transcript), auto-speak with "tap to enable sound", quick lines (elder: 2, caregiver: 1 and 3).
- [x] M3 alerts + log: pinned red alert banners on the family phone, `generateCareLog` + log card.
- [x] M4 coach + Japanese: coach function + panel (quick line 4), escalation becomes a family alert, family 中/日 toggle re-renders the feed and regenerates the log.
- [x] M5 demo view: `/demo` with three device frames, Reset demo, Reload frames, landing page, loading states, friendly errors.
- [x] M6 docs: README (architecture, run, switch to real project, privacy, safety, roadmap).

Smoke test (`npm run test:ci`): 27/27 checks pass in mock mode.

## How to run locally
```bash
npm install
npm run dev          # emulators + Vite, open http://localhost:5173/demo
npm run test:ci      # build functions, start emulators, run smoke test, stop
```

## Manual checks for the human (voice and devices)
- [ ] Chrome desktop, `/demo`: tap "enable sound" in the elder and caregiver frames, then tap quick line 1 on the caregiver → the elder tablet speaks it in Mandarin.
- [ ] Elder mic: tap 🎤, say 「好，謝謝你。可是我今天有點頭暈。」 → interim text shows, message appears, caregiver hears Indonesian, family gets a red alert.
- [ ] Caregiver mic in Indonesian (line 3) → elder hears Mandarin.
- [ ] Mic permission prompt appears inside the iframe on `/demo` (iframes have `allow="microphone; autoplay"`).
- [ ] Voices: macOS/Chrome has zh-TW (Meijia), id-ID (Damayanti), ja-JP (Kyoko) voices; on other devices check a matching voice exists.
- [ ] Family: tap 📋 Today's Log, then 日 → feed and log switch to Japanese.
- [ ] Caregiver: 🤖 Coach → quick line 4 → advice in Indonesian, red escalation note, family sees a coach alert.
- [ ] Real phones: open `https://amatomodemo.web.app/room/demo?role=caregiver` (Safari iOS supports webkitSpeechRecognition only on recent iOS; text input and quick lines always work).
- [ ] After setting the real `GMI_API_KEY`: MOCK MODE badge disappears and free-form sentences translate properly.

## Decisions
- Built on branch `feat/vann/amatomo-mvp` (global branch naming rule). Milestones M1–M5 were built together and committed as one commit after the smoke test passed, rather than one commit each.
- The human asked to iterate directly on Firebase instead of locally, so this overrides CLAUDE.md rule 3: the app is deployed to `amatomodemo`. The emulators are still used for the fast smoke test before each deploy.
- Functions run on **Node 22** (not 20): Node 20 is past end of life for Cloud Functions in late 2026, and Node 22 matches the local Node.
- `GMI_API_KEY` values that are empty or start with `placeholder`/`changeme`/`your`/`xxx`/`todo`/`dummy` mean mock mode. If a real LLM call fails, the function falls back to mock (and the badge shows).
- Web Firebase config: `VITE_FIREBASE_*` if set, otherwise Firebase Hosting's `/__/firebase/init.json`, otherwise the `demo-amatomo` placeholder. This makes the GitHub Hosting workflow work without committing any env file.
- Mock translations match the 4 demo lines with a fuzzy match (character-bigram similarity ≥ 0.75, ignoring punctuation), so speech-recognition output still hits the right line.
- The elder feed hides coach messages (they're for the caregiver). The family phone starts with auto-speak off so `/demo` doesn't speak the same line twice; elder and caregiver auto-speak after "tap to enable sound".
- No router library: `main.tsx` switches on `location.pathname`.
- Default GMI model: `deepseek-ai/DeepSeek-V3-0324` at `https://api.gmi-serving.com/v1` — change in `functions/.env` if needed.
- Removed the `lint` predeploy step added by `firebase init` (eslint google style would fail on formatting and block deploys); `build` still runs.

## Known issues
- Care log docs are keyed by date only, so regenerating in another language overwrites the stored log (the UI always shows the latest result).
- Rate limit is in memory per function instance (fine for the demo, not a real quota).
- Web bundle is ~850 kB (Firebase SDK); no code splitting.
- Anonymous Auth can't be turned on from `firebase.json`; it must be enabled in the Firebase console.
