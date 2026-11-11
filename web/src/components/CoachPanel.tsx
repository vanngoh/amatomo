import { FormEvent, useState } from "react";
import { askCoach, friendlyError } from "../api";
import { COACH_UI, DEMO_LINES } from "../i18n";

export function CoachPanel({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ advice: string; shouldEscalate: boolean } | null>(null);

  async function ask(question: string) {
    const v = question.trim();
    if (!v || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await askCoach(v, "id-ID");
      setResult(r);
      setQ("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(q);
  }

  return (
    <div className="coach-panel">
      <div className="log-head">
        <h2>🤖 {COACH_UI.title}</h2>
        <button className="ghost" onClick={onClose}>
          Tutup
        </button>
      </div>
      <p className="hint">{COACH_UI.hint}</p>
      <button className="quick-btn" disabled={busy} onClick={() => ask(DEMO_LINES.line4)}>
        <b>4</b> {DEMO_LINES.line4}
      </button>
      <form className="text-row" onSubmit={onSubmit}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={COACH_UI.placeholder} maxLength={500} lang="id" />
        <button type="submit" disabled={busy || !q.trim()}>
          {COACH_UI.ask}
        </button>
      </form>
      {busy && (
        <div className="status">
          <span className="spinner small" /> {COACH_UI.thinking}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {result && (
        <div className="coach-advice">
          {result.shouldEscalate && <div className="escalate">{COACH_UI.escalate}</div>}
          <div className="advice-text">{result.advice}</div>
        </div>
      )}
    </div>
  );
}
