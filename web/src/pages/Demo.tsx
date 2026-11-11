import { useMemo, useState } from "react";
import { friendlyError, resetDemo } from "../api";

const FRAMES = [
  { role: "elder", icon: "👵", label: "Ama · tablet · 中文", cls: "device tablet" },
  { role: "caregiver", icon: "🧕", label: "Siti · phone · Indonesia", cls: "device phone" },
  { role: "family", icon: "👩", label: "Family · phone · 中文 / 日本語", cls: "device phone" },
];

const SCRIPT = [
  "Siti taps line 1",
  "Ama taps line 2 → alert",
  "Siti taps line 3",
  "Family opens Today's Log",
  "Siti asks Coach (line 4)",
  "Family switches to 日",
];

export function Demo() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  // Fresh URL on each load/reload so device frames never show a cached old build.
  const stamp = useMemo(() => Date.now(), [key]);

  async function onReset() {
    if (!confirm("Delete all messages and logs in the demo room?")) return;
    setBusy(true);
    setMsg(null);
    try {
      await resetDemo();
      setKey((k) => k + 1); // reload frames so their state is fresh too
      setMsg("Demo reset ✓");
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="demo">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      <header className="demo-header">
        <a href="/" className="demo-brand">
          <span className="logo-mark small">🧡</span>
          <b>AmaTomo</b>
          <span className="demo-tagline">One care team, every language</span>
        </a>
        <ol className="script" aria-label="Demo script">
          {SCRIPT.map((step, i) => (
            <li key={i}>
              <b>{i + 1}</b>
              {step}
            </li>
          ))}
        </ol>
        <div className="demo-actions">
          {msg && <span className="toast">{msg}</span>}
          <button className="ghost" onClick={() => setKey((k) => k + 1)}>
            ↻ Reload
          </button>
          <button className="danger" onClick={onReset} disabled={busy}>
            {busy ? "Resetting…" : "Reset demo"}
          </button>
        </div>
      </header>
      <div className="devices">
        {FRAMES.map((f) => (
          <figure key={f.role} className="device-wrap">
            <div className={f.cls}>
              <iframe key={key} title={f.role} src={`/room/demo?role=${f.role}&v=${stamp}`} allow="microphone; autoplay" />
            </div>
            <figcaption>
              <span className="cap-pill">
                {f.icon} {f.label}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="demo-tip">Tip: tap “enable sound” inside Ama's and Siti's screens once before recording.</p>
    </main>
  );
}
