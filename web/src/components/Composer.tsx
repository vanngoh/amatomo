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

  return (
    <div className={`composer ${bigMic ? "composer-big" : ""}`}>
      {mic.listening && <div className="interim">🎙️ {mic.interim || s.listening}</div>}
      {sending && <div className="status">{s.sending}</div>}
      {error && <div className="error">{error}</div>}
      {mic.error && <div className="error">Mic: {mic.error}</div>}

      {quickLines.length > 0 && (
        <div className="quick">
          {quickLines.map((q) => (
            <button key={q.label} className="quick-btn" disabled={sending} onClick={() => send(q.text)} title={q.text}>
              <b>{q.label}</b> {q.text}
            </button>
          ))}
        </div>
      )}

      <div className="composer-row">
        {mic.supported ? (
          <button
            className={`mic ${mic.listening ? "on" : ""}`}
            onClick={mic.toggle}
            disabled={sending}
            aria-label={mic.listening ? s.tapToStop : s.tapToSpeak}
          >
            <span className="mic-icon">{mic.listening ? "⏹" : "🎤"}</span>
            <span className="mic-label">{mic.listening ? s.tapToStop : s.tapToSpeak}</span>
          </button>
        ) : (
          <div className="hint">{s.noMic}</div>
        )}
      </div>

      <form className="text-row" onSubmit={onSubmit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={s.typeHere} maxLength={500} lang={lang} />
        <button type="submit" disabled={sending || !text.trim()}>
          {s.send}
        </button>
      </form>
    </div>
  );
}
