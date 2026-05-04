/* HR Detail — single candidate's AI report */

function HRDetail({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];

  const scores = lang === "fr" ? [
    { k: "Communication", v: 92 },
    { k: "Technique", v: 84 },
    { k: "Résolution", v: 88 },
    { k: "Collaboration", v: 90 },
    { k: "Clarté code", v: 78 },
    { k: "Pensée système", v: 85 },
  ] : [
    { k: "Communication", v: 92 },
    { k: "Technical", v: 84 },
    { k: "Problem solving", v: 88 },
    { k: "Collaboration", v: 90 },
    { k: "Code clarity", v: 78 },
    { k: "Systems thinking", v: 85 },
  ];

  const moments = lang === "fr" ? [
    { t: "03:12", q: "Présentation du parcours", tag: "Clarté +", color: "sage" },
    { t: "11:40", q: "Trade-offs latence vs cohérence", tag: "Expertise +", color: "sage" },
    { t: "18:25", q: "Hésitation sur les cas limites", tag: "À creuser", color: "butter" },
    { t: "27:02", q: "Solution Group Anagrams en O(n·k)", tag: "Excellent", color: "sage" },
    { t: "34:18", q: "Questions sur l'équipe", tag: "Curieux +", color: "plum" },
  ] : [
    { t: "03:12", q: "Background introduction", tag: "Clarity +", color: "sage" },
    { t: "11:40", q: "Latency vs consistency trade-offs", tag: "Expertise +", color: "sage" },
    { t: "18:25", q: "Hesitation on edge cases", tag: "Explore further", color: "butter" },
    { t: "27:02", q: "O(n·k) Group Anagrams solution", tag: "Excellent", color: "sage" },
    { t: "34:18", q: "Questions about the team", tag: "Curious +", color: "plum" },
  ];

  return (
    <div data-theme={theme} className="rt-root" style={{
      width: 1280, height: 820,
      background: "var(--bg)",
      display: "grid", gridTemplateColumns: "224px 1fr",
      fontFamily: "var(--sans)",
    }}>
      <SideNav lang={lang} active="interviews" />

      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Breadcrumb + actions */}
        <div style={{
          padding: "18px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{S.hr_interviews}</span> <ChevronRight size={12} /> <span style={{ color: "var(--ink)" }}>Amina Chaoui</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="rt-btn rt-btn-ghost" style={{ fontSize: 12, padding: "8px 14px" }}>
              <DownloadIcon size={13} /> {S.det_download}
            </button>
            <button className="rt-btn rt-btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}>
              <CheckIcon size={13} /> {S.det_shortlist}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }} className="rt-scroll">
          {/* Hero */}
          <div style={{ padding: "28px 32px 24px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{
                width: 76, height: 76, borderRadius: 999,
                background: "#E8C9B4", color: "var(--ink)",
                display: "grid", placeItems: "center",
                fontSize: 26, fontWeight: 500,
                border: "1px solid rgba(0,0,0,0.06)",
              }}>AC</div>
              <div>
                <h1 className="rt-serif" style={{ fontSize: 36, margin: 0, letterSpacing: "-0.01em" }}>Amina Chaoui</h1>
                <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
                  Senior Backend Engineer · {lang === "fr" ? "Entretien du 22 avril, 42 min" : "Interview on Apr 22, 42 min"}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <span className="rt-pill" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}>
                    <CheckIcon size={11} /> {S.hr_status_shortlist}
                  </span>
                  <span className="rt-pill" style={{ background: "var(--bg-deep)", color: "var(--muted)" }}>Python · Go · PostgreSQL</span>
                </div>
              </div>
            </div>

            {/* Aria overall score */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 22,
              padding: 20,
              display: "flex", alignItems: "center", gap: 18,
            }}>
              <AriaOrb size={64} state="idle" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {S.hr_score}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                  <span className="rt-serif" style={{ fontSize: 44, lineHeight: 1, color: "var(--ink)" }}>87</span>
                  <span style={{ fontSize: 14, color: "var(--muted)" }}>/100</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--sage)", marginTop: 4 }}>
                  {lang === "fr" ? "Top 12% des candidats" : "Top 12% of candidates"}
                </div>
              </div>
            </div>
          </div>

          {/* Aria's summary card */}
          <div style={{ padding: "0 32px 24px" }}>
            <div style={{
              background: "var(--terracotta-soft)",
              borderRadius: 22,
              padding: "22px 26px",
              border: "1px solid rgba(232,115,74,0.18)",
              display: "flex", gap: 18, alignItems: "flex-start",
            }}>
              <AriaOrb size={40} state="idle" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--terracotta-deep)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  {lang === "fr" ? "Synthèse d'Aria" : "Aria's summary"}
                </div>
                <p className="rt-serif" style={{ fontSize: 22, lineHeight: 1.35, margin: 0, color: "var(--ink)", maxWidth: 860 }}>
                  {lang === "fr"
                    ? "Excellente candidate avec une maturité technique confirmée. Communication très claire, bonne intuition système. À creuser : gestion fine des cas limites sous pression."
                    : "Excellent candidate with confirmed technical maturity. Very clear communication, strong systems intuition. Explore further: handling fine edge cases under pressure."}
                </p>
              </div>
            </div>
          </div>

          {/* Skill scores + moments */}
          <div style={{ padding: "0 32px 32px", display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 20 }}>
            {/* Skills */}
            <div className="rt-card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="rt-serif" style={{ fontSize: 20 }}>{S.det_evaluation}</div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {lang === "fr" ? "6 dimensions" : "6 dimensions"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {scores.map((s, i) => (
                  <SkillBar key={i} label={s.k} value={s.v} />
                ))}
              </div>
            </div>

            {/* Moments / transcript player */}
            <div className="rt-card" style={{ padding: 22, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="rt-serif" style={{ fontSize: 20 }}>{S.det_moments}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={pillBtn}>{S.det_transcript}</button>
                  <button style={{ ...pillBtn, background: "var(--ink)", color: "var(--bg)", border: "1px solid var(--ink)" }}>
                    {lang === "fr" ? "Vidéo" : "Video"}
                  </button>
                </div>
              </div>

              {/* Video timeline mini-player */}
              <div style={{
                position: "relative",
                height: 90, borderRadius: 16,
                background: "linear-gradient(135deg, #2E221A, #1A1410)",
                overflow: "hidden",
                marginBottom: 14,
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: `
                    radial-gradient(ellipse 30% 60% at 30% 50%, rgba(232,115,74,0.3), transparent),
                    radial-gradient(ellipse 30% 60% at 75% 50%, rgba(46,93,79,0.3), transparent)
                  `,
                }} />
                {/* waveform */}
                <div style={{ position: "absolute", inset: "25% 12px", display: "flex", alignItems: "center", gap: 2 }}>
                  {Array.from({ length: 80 }).map((_, i) => {
                    const h = 20 + Math.abs(Math.sin(i * 0.7) * 30) + Math.abs(Math.cos(i * 0.33) * 15);
                    return <div key={i} style={{ flex: 1, height: h + "%", background: "rgba(244,217,206,0.7)", borderRadius: 1 }} />;
                  })}
                </div>
                {/* playhead */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0, left: "32%",
                  width: 2, background: "var(--terracotta)",
                  boxShadow: "0 0 12px var(--terracotta)",
                }} />
                {/* time */}
                <div style={{
                  position: "absolute", bottom: 8, left: 12,
                  fontSize: 11, color: "#E8DFD0", fontFamily: "var(--mono)",
                }}>13:24 / 42:18</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {moments.map((m, i) => (
                  <MomentRow key={i} m={m} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const pillBtn = {
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--ink)",
  padding: "5px 12px",
  borderRadius: 999,
  fontSize: 11.5,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 500,
};

function SkillBar({ label, value }) {
  const color = value >= 85 ? "var(--sage)" : value >= 70 ? "var(--terracotta)" : "#B94A3B";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--bg-deep)", overflow: "hidden" }}>
        <div style={{ width: value + "%", height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function MomentRow({ m }) {
  const colors = {
    sage: { bg: "var(--sage-soft)", fg: "var(--sage)" },
    butter: { bg: "#F5EBD2", fg: "#8F6B1E" },
    plum: { bg: "#EADFE6", fg: "var(--plum)" },
  };
  const c = colors[m.color];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      gap: 12, alignItems: "center",
      padding: "8px 12px",
      borderRadius: 12,
      background: "var(--bg)",
      border: "1px solid var(--border)",
      cursor: "pointer",
    }}>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)",
        padding: "2px 8px", borderRadius: 6,
        background: "var(--bg-deep)",
      }}>{m.t}</span>
      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{m.q}</span>
      <span className="rt-pill" style={{ background: c.bg, color: c.fg }}>{m.tag}</span>
    </div>
  );
}

Object.assign(window, { HRDetail });
