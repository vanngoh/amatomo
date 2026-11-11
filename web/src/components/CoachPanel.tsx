import { FormEvent, useState } from "react";
import { askCoach, friendlyError } from "../api";
import { COACH_UI, DEMO_LINES, parseSteps } from "../i18n";
import { Steps } from "./Feed";
import { Sheet } from "./Sheet";

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
      setResult(await askCoach(v, "id-ID"));
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

  const steps = result ? parseSteps(result.advice) : [];

  return (
    <Sheet tone="coach" closeLabel="Tutup" onClose={onClose} title={<>🤖 {COACH_UI.title}</>}>
      <p className="hint">{COACH_UI.hint}</p>
      <button className="quick-btn quick-wide" disabled={busy} onClick={() => ask(DEMO_LINES.line4)}>
        <b>4</b>
        <span>{DEMO_LINES.line4}</span>
      </button>
      <form className="pill-input" onSubmit={onSubmit}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={COACH_UI.placeholder} maxLength={500} lang="id" aria-label={COACH_UI.placeholder} />
        <button type="submit" className="send send-text" disabled={busy || !q.trim()}>
          {COACH_UI.ask}
        </button>
      </form>
      {busy && (
        <div className="coach-thinking">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          {COACH_UI.thinking}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {result && (
        <div className="coach-advice">
          {result.shouldEscalate && <div className="escalate">{COACH_UI.escalate}</div>}
          {steps.length ? <Steps steps={steps} /> : <div className="advice-text">{result.advice}</div>}
        </div>
      )}
    </Sheet>
  );
}
