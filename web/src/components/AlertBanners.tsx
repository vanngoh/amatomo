import { useState } from "react";
import { t } from "../i18n";
import type { Lang, Message } from "../types";

export function AlertBanners({ messages, lang }: { messages: Message[]; lang: Lang }) {
  const s = t(lang);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alerts = messages.filter((m) => m.isAlert && !dismissed.has(m.id)).slice(-3).reverse();
  if (!alerts.length) return null;
  return (
    <div className="alerts" role="alert">
      {alerts.map((m) => (
        <div key={m.id} className="alert-banner">
          <div className="alert-body">
            <div className="alert-title">
              🔔 {s.alert}: {s.role[m.senderRole]}
              {m.alertReason && <span className="alert-reason"> · {m.alertReason}</span>}
            </div>
            <div className="alert-text">{m.translations?.[lang] || m.originalText}</div>
          </div>
          <button className="alert-dismiss" onClick={() => setDismissed(new Set(dismissed).add(m.id))}>
            {s.dismiss}
          </button>
        </div>
      ))}
    </div>
  );
}
