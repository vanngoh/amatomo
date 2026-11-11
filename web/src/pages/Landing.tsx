const ROLES = [
  { href: "/room/demo?role=elder", icon: "👵", cls: "elder", title: "Ama · 阿嬤", sub: "Tablet · 中文" },
  { href: "/room/demo?role=caregiver", icon: "🧕", cls: "caregiver", title: "Siti · Caregiver", sub: "Phone · Bahasa Indonesia" },
  { href: "/room/demo?role=family", icon: "👩", cls: "family", title: "Family · 家人 / 家族", sub: "Phone · 中文 / 日本語" },
];

const FEATURES = ["🌏 Live translation", "🔊 Read aloud", "🔔 Health alerts", "📋 Daily care log", "🤖 Caregiver coach"];

export function Landing() {
  return (
    <main className="landing">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      <section className="hero">
        <img className="logo-mark" src="/logo-mark.svg" alt="" width="96" height="84" />
        <h1>AmaTomo</h1>
        <p className="tagline">One care team, every language</p>
        <p className="meaning">
          阿嬤 <i>a-má</i> “grandma” + 友 <i>tomo</i> “friend”
        </p>
        <div className="feature-pills">
          {FEATURES.map((f) => (
            <span key={f} className="feature-pill">
              {f}
            </span>
          ))}
        </div>
        <a className="cta" href="/demo">
          🎬 Open the demo view <span aria-hidden="true">→</span>
        </a>
      </section>
      <section className="role-cards">
        {ROLES.map((r) => (
          <a key={r.href} className={`role-card role-${r.cls}`} href={r.href}>
            <span className={`avatar avatar-${r.cls} avatar-lg`}>{r.icon}</span>
            <span className="role-text">
              <b>{r.title}</b>
              <small>{r.sub}</small>
            </span>
            <span className="role-arrow" aria-hidden="true">
              →
            </span>
          </a>
        ))}
      </section>
      <p className="fineprint">No audio is stored · Red flags go straight to the family · The coach never diagnoses</p>
    </main>
  );
}
