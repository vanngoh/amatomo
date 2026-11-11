import { useEffect, useRef } from "react";
import { LANG_LABEL, parseSteps, ROLE_ICON, t } from "../i18n";
import type { Lang, Message, Role } from "../types";

function time(d: Date | null) {
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Avatar({ role, size }: { role: Role; size?: "lg" }) {
  return (
    <span className={`avatar avatar-${role} ${size === "lg" ? "avatar-lg" : ""}`} aria-hidden="true">
      {ROLE_ICON[role]}
    </span>
  );
}

export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="steps">
      {steps.map((st, i) => (
        <li key={i}>
          <span className="step-num">{i + 1}</span>
          <span>{st}</span>
        </li>
      ))}
    </ol>
  );
}

export function Feed({ messages, lang, viewer, loading }: { messages: Message[]; lang: Lang; viewer: Role; loading: boolean }) {
  const s = t(lang);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll our own container only (scrollIntoView would also scroll the /demo parent page).
    const box = end.current?.closest(".room-scroll");
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (loading)
    return (
      <div className="feed">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`skeleton-bubble ${i % 2 ? "right" : ""}`} />
        ))}
      </div>
    );

  if (!messages.length)
    return (
      <div className="feed feed-empty">
        <div className="empty-art" aria-hidden="true">
          <span>👵</span>
          <span>🧕</span>
          <span>👩</span>
        </div>
        <p>{s.empty}</p>
      </div>
    );

  return (
    <div className="feed">
      <div className="day-divider">
        <span>{s.today}</span>
      </div>
      {messages.map((m) => {
        const mine = m.senderRole === viewer;
        const text = m.translations?.[lang] || m.originalText;
        const showOriginal = m.originalLang !== lang && m.originalText !== text;
        const steps = m.senderRole === "coach" ? parseSteps(text) : [];
        return (
          <div key={m.id} className={`msg-row ${mine ? "mine" : ""} ${m.senderRole === "coach" ? "row-coach" : ""}`}>
            {!mine && <Avatar role={m.senderRole} />}
            <div className="msg-col">
              <div className="msg-head">
                <span className="msg-role">{s.role[m.senderRole]}</span>
                <span className="msg-time">{time(m.createdAt)}</span>
              </div>
              <div className={`bubble bubble-${m.senderRole} ${m.isAlert ? "bubble-alert" : ""}`}>
                {m.isAlert && <span className="alert-tag">🔔 {s.alert}</span>}
                {steps.length ? <Steps steps={steps} /> : <div className="msg-text">{text}</div>}
                {showOriginal && (
                  <div className="msg-original">
                    <span className="lang-pill">{LANG_LABEL[m.originalLang]}</span> {m.originalText}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}
