import { ReactNode, useEffect } from "react";

/** Bottom sheet that slides up over the room. Tap the backdrop or ✕ to close. */
export function Sheet({ title, onClose, closeLabel, tone, children }: { title: ReactNode; onClose: () => void; closeLabel: string; tone?: "coach" | "log"; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-layer">
      <div className="sheet-backdrop" onClick={onClose} />
      <section className={`sheet sheet-${tone || "log"}`} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
