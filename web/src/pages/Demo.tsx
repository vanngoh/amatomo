import { useState } from "react";
import { friendlyError, resetDemo } from "../api";

const FRAMES = [
  { role: "elder", label: "👵 Ama · tablet (zh-TW)", cls: "device tablet" },
  { role: "caregiver", label: "🧕 Siti · phone (id-ID)", cls: "device phone" },
  { role: "family", label: "👩 Family · phone (zh-TW / ja-JP)", cls: "device phone" },
];

export function Demo() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState(0);

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
      <header className="demo-header">
        <a href="/" className="demo-brand">
          🧡 <b>AmaTomo</b> <span>One care team, every language</span>
        </a>
        <div className="demo-actions">
          {msg && <span className="status">{msg}</span>}
          <button className="ghost" onClick={() => setKey((k) => k + 1)}>
            ↻ Reload frames
          </button>
          <button className="danger" onClick={onReset} disabled={busy}>
            {busy ? "Resetting…" : "Reset demo"}
          </button>
        </div>
      </header>
      <p className="demo-tip">Tip: tap “enable sound” inside each device once before recording.</p>
      <div className="devices">
        {FRAMES.map((f) => (
          <figure key={f.role} className="device-wrap">
            <div className={f.cls}>
              <iframe key={key} title={f.role} src={`/room/demo?role=${f.role}`} allow="microphone; autoplay" />
            </div>
            <figcaption>{f.label}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
