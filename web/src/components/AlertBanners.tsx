import { useState } from "react";
import { t } from "../i18n";
import type { Lang, Message } from "../types";

export function AlertBanners({ messages, lang }: { messages: Message[]; lang: Lang }) {
  const s = t(lang);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alerts = messages.filter((m) => m.isAlert && !dismissed.has(m.id)).slice(-2).reverse();
  if (!alerts.length) return null;
  return (
    <div className="alerts" role="alert">
      {alerts.map((m) => (
        <div key={m.id} className="alert-card">
          <span className="alert-icon" aria-hidden="true">
            🔔
          </span>
          <div className="alert-body">
            <div className="alert-title">
              {s.alert} · {s.role[m.senderRole]}
            </div>
            <div className="alert-text">{m.translations?.[lang] || m.originalText}</div>
          </div>
          <button className="icon-btn alert-dismiss" onClick={() => setDismissed(new Set(dismissed).add(m.id))} aria-label={s.dismiss} title={s.dismiss}>
            ✓
          </button>
        </div>
      ))}
    </div>
  );
}
