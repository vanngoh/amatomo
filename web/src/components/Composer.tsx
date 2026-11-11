import { FormEvent, useState } from "react";
import { friendlyError, sendMessage } from "../api";
import { t } from "../i18n";
import { useRecognition } from "../speech";
import type { Lang, Role } from "../types";

export interface QuickLine {
  label: string;
  text: string;
}

export function Composer({ role, lang, quickLines, bigMic }: { role: Role; lang: Lang; quickLines: QuickLine[]; bigMic?: boolean }) {
  const s = t(lang);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(value: string) {
    const v = value.trim();
    if (!v || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(role, v, lang);
      setText("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSending(false);
    }
  }

  const mic = useRecognition(lang, (finalText) => send(finalText));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(text);
  }

  const micButton = mic.supported ? (
    <button
      className={`mic ${mic.listening ? "on" : ""} ${bigMic ? "mic-big" : ""}`}
      onClick={mic.toggle}
      disabled={sending}
      aria-label={mic.listening ? s.tapToStop : s.tapToSpeak}
      title={mic.listening ? s.tapToStop : s.tapToSpeak}
    >
      {mic.listening ? <StopIcon /> : <MicIcon />}
    </button>
  ) : null;

  return (
    <div className={`composer ${bigMic ? "composer-big" : ""}`}>
      {mic.listening && (
        <div className="listening">
          <Wave />
          <span>{mic.interim || s.listening}</span>
        </div>
      )}
      {sending && (
        <div className="typing">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          {s.sending}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {mic.error && <div className="error">Mic: {mic.error}</div>}
      {!mic.supported && <div className="hint">{s.noMic}</div>}

      {quickLines.length > 0 && (
        <div className="quick" role="list">
          {quickLines.map((q) => (
            <button key={q.label} role="listitem" className="quick-btn" disabled={sending} onClick={() => send(q.text)} title={q.text}>
              <b>{q.label}</b>
              <span>{q.text}</span>
            </button>
          ))}
        </div>
      )}

      {bigMic && micButton && <div className="mic-stage">{micButton}</div>}

      <div className="input-row">
        <form className="pill-input" onSubmit={onSubmit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={s.typeHere} maxLength={500} lang={lang} aria-label={s.typeHere} />
          <button type="submit" className="send" disabled={sending || !text.trim()} aria-label={s.send} title={s.send}>
            <SendIcon />
          </button>
        </form>
        {!bigMic && micButton}
      </div>
    </div>
  );
}

function Wave() {
  return (
    <span className="wave" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

function MicIcon() {
  return (
    <svg className="mic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="mic-svg" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
    </svg>
  );
}
