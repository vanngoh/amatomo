const ROLES = [
  { href: "/room/demo?role=elder", icon: "👵", title: "Ama · 阿嬤", sub: "Tablet · 中文 (zh-TW)" },
  { href: "/room/demo?role=caregiver", icon: "🧕", title: "Siti · Caregiver", sub: "Phone · Bahasa Indonesia" },
  { href: "/room/demo?role=family", icon: "👩", title: "Family · 家人 / 家族", sub: "Phone · 中文 / 日本語" },
];

export function Landing() {
  return (
    <main className="landing">
      <div className="hero">
        <div className="logo">🧡</div>
        <h1>AmaTomo</h1>
        <p className="tagline">One care team, every language</p>
        <p className="meaning">
          阿嬤 <i>a-má</i> (Taiwanese “grandma”) + 友 <i>tomo</i> (Japanese “friend”)
        </p>
      </div>
      <div className="role-cards">
        {ROLES.map((r) => (
          <a key={r.href} className="role-card" href={r.href}>
            <span className="role-icon">{r.icon}</span>
            <span>
              <b>{r.title}</b>
              <small>{r.sub}</small>
            </span>
          </a>
        ))}
        <a className="role-card demo-card" href="/demo">
          <span className="role-icon">🎬</span>
          <span>
            <b>Demo view</b>
            <small>All three devices side by side</small>
          </span>
        </a>
      </div>
      <p className="fineprint">AI translates, reads messages aloud, flags health red flags, and writes the daily care log.</p>
    </main>
  );
}
