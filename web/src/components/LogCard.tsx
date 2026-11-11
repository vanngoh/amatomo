import { t } from "../i18n";
import type { CareLog, Lang } from "../types";

export function LogCard({
  log,
  lang,
  loading,
  error,
  onClose,
}: {
  log: CareLog | null;
  lang: Lang;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const s = t(lang);
  return (
    <div className="log-card">
      <div className="log-head">
        <h2>{s.todayLog.replace("📋 ", "")}</h2>
        {log && <span className="log-date">{log.date}</span>}
        <button className="ghost" onClick={onClose}>
          {s.close}
        </button>
      </div>
      {loading && (
        <div className="status">
          <span className="spinner small" /> {s.loading}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {log && !loading && (
        <dl className="log-grid">
          <dt>🍚 {s.meals}</dt>
          <dd>{log.meals}</dd>
          <dt>💊 {s.medication}</dt>
          <dd>{log.medication}</dd>
          <dt>🙂 {s.mood}</dt>
          <dd>{log.mood}</dd>
          <dt>🔔 {s.alerts}</dt>
          <dd>
            {log.alerts.length ? (
              <ul className="log-alerts">
                {log.alerts.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            ) : (
              s.noAlerts
            )}
          </dd>
          <dt>📝 {s.summary}</dt>
          <dd className="log-summary">{log.summary}</dd>
        </dl>
      )}
    </div>
  );
}
