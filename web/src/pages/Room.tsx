import { useEffect, useRef, useState } from "react";
import { friendlyError, generateCareLog } from "../api";
import { AlertBanners } from "../components/AlertBanners";
import { CoachPanel } from "../components/CoachPanel";
import { Composer, QuickLine } from "../components/Composer";
import { Feed } from "../components/Feed";
import { LogCard } from "../components/LogCard";
import { MockBadge } from "../components/MockBadge";
import { DEMO_LINES, ROLE_ICON, t } from "../i18n";
import { speak, stopSpeaking, unlockSpeech } from "../speech";
import type { CareLog, Lang } from "../types";
import { useMessages } from "../useMessages";

const VIEW_ROLES = ["elder", "caregiver", "family"] as const;
type ViewRole = (typeof VIEW_ROLES)[number];

function readFamilyLang(): Lang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "ja-JP" || q === "zh-TW") return q;
  try {
    const v = localStorage.getItem("amatomo.familyLang");
    if (v === "ja-JP" || v === "zh-TW") return v;
  } catch {
    /* storage blocked */
  }
  return "zh-TW";
}

export function Room() {
  const param = new URLSearchParams(location.search).get("role");
  const role: ViewRole = (VIEW_ROLES as readonly string[]).includes(param || "") ? (param as ViewRole) : "caregiver";

  const [familyLang, setFamilyLang] = useState<Lang>(readFamilyLang);
  const lang: Lang = role === "elder" ? "zh-TW" : role === "caregiver" ? "id-ID" : familyLang;
  const s = t(lang);

  const { messages: all, loading, error } = useMessages();
  // The elder doesn't need the caregiver's coaching advice.
  const messages = role === "elder" ? all.filter((m) => m.senderRole !== "coach") : all;

  // ----- Sound -----
  // Elder and caregiver start with "Tap to enable sound"; family starts muted.
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(role !== "family");
  const soundOn = soundUnlocked && autoSpeak;
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!seen.current) {
      // First snapshot: don't read out history.
      seen.current = new Set(messages.map((m) => m.id));
      return;
    }
    for (const m of messages) {
      if (seen.current.has(m.id)) continue;
      seen.current.add(m.id);
      if (soundOn && m.senderRole !== role) speak(m.translations?.[lang] || m.originalText, lang);
    }
  }, [messages, loading, soundOn, role, lang]);

  function enableSound() {
    unlockSpeech();
    setSoundUnlocked(true);
    setAutoSpeak(true);
  }

  function toggleAutoSpeak() {
    if (!soundUnlocked) return enableSound();
    if (autoSpeak) stopSpeaking();
    setAutoSpeak(!autoSpeak);
  }

  // ----- Family: language + log -----
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<CareLog | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  async function loadLog(l: Lang) {
    setLogOpen(true);
    setLogLoading(true);
    setLogError(null);
    try {
      setLog(await generateCareLog(l));
    } catch (e) {
      setLogError(friendlyError(e));
    } finally {
      setLogLoading(false);
    }
  }

  function switchFamilyLang(l: Lang) {
    if (l === familyLang) return;
    setFamilyLang(l);
    try {
      localStorage.setItem("amatomo.familyLang", l);
    } catch {
      /* ignore */
    }
    if (logOpen) loadLog(l);
  }

  // ----- Caregiver: coach -----
  const [coachOpen, setCoachOpen] = useState(false);

  const quickLines: QuickLine[] =
    role === "elder"
      ? [{ label: "2", text: DEMO_LINES.line2 }]
      : role === "caregiver"
        ? [
            { label: "1", text: DEMO_LINES.line1 },
            { label: "3", text: DEMO_LINES.line3 },
          ]
        : [];

  const feedHasMock = messages.some((m) => m.mock);

  return (
    <div className={`room room-${role}`} lang={lang}>
      <header className="room-header">
        <div className="who">
          <span className="who-icon">{ROLE_ICON[role]}</span>
          <div>
            <div className="who-name">{s.role[role]}</div>
            <div className="who-sub">AmaTomo · {role === "family" ? "" : lang}</div>
          </div>
        </div>
        <div className="header-actions">
          <MockBadge fromFeed={feedHasMock} />
          {role === "family" && (
            <div className="seg" role="group" aria-label="Language">
              <button className={familyLang === "zh-TW" ? "on" : ""} onClick={() => switchFamilyLang("zh-TW")}>
                中
              </button>
              <button className={familyLang === "ja-JP" ? "on" : ""} onClick={() => switchFamilyLang("ja-JP")}>
                日
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="room-scroll">
      {role === "family" && <AlertBanners messages={messages} lang={lang} />}

      <div className="toolbar">
        {role !== "family" && !soundUnlocked ? (
          <button className="sound-unlock" onClick={enableSound}>
            {s.enableSound}
          </button>
        ) : (
          role !== "elder" && (
            <button className={`chip ${soundOn ? "on" : ""}`} onClick={toggleAutoSpeak}>
              {soundOn ? s.soundOn : s.soundOff}
            </button>
          )
        )}
        {role === "caregiver" && (
          <button className="chip coach-chip" onClick={() => setCoachOpen(!coachOpen)}>
            🤖 Coach
          </button>
        )}
        {role === "family" && (
          <button className="chip log-chip" onClick={() => (logOpen ? setLogOpen(false) : loadLog(lang))}>
            {s.todayLog}
          </button>
        )}
      </div>

      {role === "caregiver" && coachOpen && <CoachPanel onClose={() => setCoachOpen(false)} />}
      {role === "family" && logOpen && (
        <LogCard log={log} lang={lang} loading={logLoading} error={logError} onClose={() => setLogOpen(false)} />
      )}

      {error && <div className="error">{error}</div>}
      <Feed messages={messages} lang={lang} viewer={role} loading={loading} />
      </div>
      <Composer role={role} lang={lang} quickLines={quickLines} bigMic={role === "elder"} />
    </div>
  );
}
