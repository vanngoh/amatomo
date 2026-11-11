import { t } from "../i18n";
import type { CareLog, Lang } from "../types";
import { Sheet } from "./Sheet";

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
    <Sheet
      tone="log"
      closeLabel={s.close}
      onClose={onClose}
      title={
        <>
          {s.todayLog} {log && !loading && <span className="date-pill">{log.date}</span>}
        </>
      }
    >
      {error && <div className="error">{error}</div>}
      {loading && (
        <div className="log-tiles">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tile skeleton" />
          ))}
          <div className="tile tile-wide skeleton" />
        </div>
      )}
      {log && !loading && (
        <>
          <div className="summary-card">{log.summary}</div>
          <div className="log-tiles">
            <div className="tile tile-meal">
              <span className="tile-icon">🍚</span>
              <div className="tile-label">{s.meals}</div>
              <div className="tile-text">{log.meals}</div>
            </div>
            <div className="tile tile-med">
              <span className="tile-icon">💊</span>
              <div className="tile-label">{s.medication}</div>
              <div className="tile-text">{log.medication}</div>
            </div>
            <div className="tile tile-mood">
              <span className="tile-icon">🙂</span>
              <div className="tile-label">{s.mood}</div>
              <div className="tile-text">{log.mood}</div>
            </div>
            <div className={`tile tile-wide ${log.alerts.length ? "tile-alert" : "tile-ok"}`}>
              <span className="tile-icon">{log.alerts.length ? "🔔" : "✅"}</span>
              <div className="tile-label">{s.alerts}</div>
              {log.alerts.length ? (
                <ul className="log-alerts">
                  {log.alerts.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              ) : (
                <div className="tile-text">{s.noAlerts}</div>
              )}
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
