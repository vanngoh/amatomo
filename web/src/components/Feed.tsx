import { useEffect, useRef } from "react";
import { LANG_LABEL, ROLE_ICON, t } from "../i18n";
import type { Lang, Message, Role } from "../types";

function time(d: Date | null) {
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Feed({ messages, lang, viewer, loading }: { messages: Message[]; lang: Lang; viewer: Role; loading: boolean }) {
  const s = t(lang);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll our own container only (scrollIntoView would also scroll the /demo parent page).
    const box = end.current?.closest(".room-scroll");
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (loading) return <div className="feed feed-empty"><div className="spinner" /></div>;
  if (!messages.length) return <div className="feed feed-empty">{s.empty}</div>;

  return (
    <div className="feed">
      {messages.map((m) => {
        const mine = m.senderRole === viewer;
        const text = m.translations?.[lang] || m.originalText;
        const showOriginal = m.originalLang !== lang && m.originalText !== text;
        return (
          <div key={m.id} className={`msg msg-${m.senderRole} ${mine ? "mine" : ""} ${m.isAlert ? "msg-alert" : ""}`}>
            <div className="msg-head">
              <span className="msg-icon">{ROLE_ICON[m.senderRole]}</span>
              <span className="msg-role">{s.role[m.senderRole]}</span>
              <span className="msg-time">{time(m.createdAt)}</span>
              {m.isAlert && <span className="msg-flag">⚠️</span>}
            </div>
            <div className="msg-text">{text}</div>
            {showOriginal && (
              <div className="msg-original">
                {s.original} ({LANG_LABEL[m.originalLang]}): {m.originalText}
              </div>
            )}
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}
