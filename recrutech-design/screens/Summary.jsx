/* Post-interview summary — thank-you + light feedback */

function Summary({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];

  const highlights = lang === "fr" ? [
    { t: "Communication claire", d: "Explications structurées et synthétiques." },
    { t: "Bonnes pratiques code", d: "Nommage cohérent et gestion d'erreurs." },
    { t: "Pensée système", d: "Compromis latence/cohérence bien identifiés." },
  ] : [
    { t: "Clear communication", d: "Structured and synthetic explanations." },
    { t: "Code craftsmanship", d: "Consistent naming and error handling." },
    { t: "Systems thinking", d: "Well-identified latency/consistency trade-offs." },
  ];

  return (
    <div data-theme={theme} className="rt-root" style={{
      width: 1280, height: 820,
      background: "var(--bg)",
      fontFamily: "var(--sans)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "18px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--border)",
      }}>
        <Logo size={22} />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {lang === "fr" ? "Entretien terminé" : "Interview ended"} · 10:42 · Lumen Labs
        </span>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 0, overflow: "hidden" }}>
        {/* Left */}
        <div style={{
          padding: "64px 56px",
          display: "flex", flexDirection: "column",
          background: `radial-gradient(ellipse 80% 60% at 30% 30%, var(--terracotta-soft), transparent 60%), var(--bg)`,
        }}>
          <div style={{ marginBottom: 28 }}>
            <AriaOrb size={100} state="idle" />
          </div>
          <h1 className="rt-serif" style={{ fontSize: 68, lineHeight: 1, margin: 0, color: "var(--ink)", letterSpacing: "-0.015em" }}>
            {S.sum_title}
          </h1>
          <p style={{ fontSize: 18, color: "var(--muted)", marginTop: 18, lineHeight: 1.5, maxWidth: 480 }}>
            {S.sum_sub}
          </p>

          <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "auto auto auto", gap: 32, width: "fit-content" }}>
            <Stat label={S.sum_duration} value="42:18" unit="min" />
            <Stat label={S.sum_questions} value="14" />
            <Stat label={lang === "fr" ? "Étapes" : "Stages"} value="5/5" />
          </div>

          <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
            <button className="rt-btn rt-btn-primary">
              {lang === "fr" ? "Retour à l'accueil" : "Back to home"} <ArrowRight size={14} />
            </button>
            <button className="rt-btn rt-btn-ghost">
              {lang === "fr" ? "Donner mon avis" : "Share feedback"}
            </button>
          </div>
        </div>

        {/* Right — highlights */}
        <div style={{
          padding: "64px 56px 48px 32px",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          overflowY: "auto",
        }} className="rt-scroll">
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            {S.sum_highlights}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {highlights.map((h, i) => (
              <div key={i} className="rt-card" style={{ padding: 18, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: "var(--sage-soft)", color: "var(--sage)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <CheckIcon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{h.t}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{h.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 28,
            padding: 22,
            borderRadius: 20,
            background: "var(--terracotta-soft)",
            border: "1px solid rgba(232,115,74,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: "var(--terracotta-deep)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <SparkleIcon size={12} fill="currentColor" /> {S.sum_next}
            </div>
            <p className="rt-serif" style={{ fontSize: 22, lineHeight: 1.3, color: "var(--ink)", margin: "10px 0 0" }}>
              {S.sum_feedback_in}
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
              {lang === "fr"
                ? "Vous recevrez un rapport personnalisé par e-mail avec des recommandations pour progresser."
                : "You'll receive a personalized report by email with recommendations to grow."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="rt-serif" style={{ fontSize: 38, color: "var(--ink)", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: "var(--muted)" }}>{unit}</span>}
      </div>
    </div>
  );
}

Object.assign(window, { Summary });
