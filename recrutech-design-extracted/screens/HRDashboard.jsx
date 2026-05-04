/* HR Dashboard — list of interviews */

function HRDashboard({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const candidates = [
    { name: "Amina Chaoui", role: "Senior Backend Engineer", stage: "technical", score: 87, status: "shortlist", when: lang === "fr" ? "il y a 2h" : "2h ago", avatar: "#E8C9B4", initials: "AC" },
    { name: "Thomas Berger", role: "Staff Data Engineer", stage: "code", score: 74, status: "review", when: lang === "fr" ? "hier" : "yesterday", avatar: "#D9E5DF", initials: "TB" },
    { name: "Léa Dupont", role: "Frontend Engineer", stage: "intro", score: 91, status: "shortlist", when: lang === "fr" ? "il y a 3h" : "3h ago", avatar: "#F4D9CE", initials: "LD" },
    { name: "Kenji Nakamura", role: "Senior Backend Engineer", stage: "completed", score: 68, status: "review", when: lang === "fr" ? "lundi" : "Mon", avatar: "#EFE5D4", initials: "KN" },
    { name: "Sofia Ricci", role: "ML Engineer", stage: "completed", score: 82, status: "new", when: lang === "fr" ? "il y a 10min" : "10min ago", avatar: "#E8C9B4", initials: "SR" },
    { name: "Marc Olivier", role: "Frontend Engineer", stage: "completed", score: 59, status: "declined", when: lang === "fr" ? "mar" : "Tue", avatar: "#C8B89E", initials: "MO" },
    { name: "Priya Shah", role: "Staff Data Engineer", stage: "completed", score: 79, status: "review", when: lang === "fr" ? "mer" : "Wed", avatar: "#D9E5DF", initials: "PS" },
    { name: "Hugo Martin", role: "ML Engineer", stage: "completed", score: 88, status: "shortlist", when: lang === "fr" ? "jeu" : "Thu", avatar: "#F4D9CE", initials: "HM" },
  ];

  const filtered = candidates.filter(c => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div data-theme={theme} className="rt-root" style={{
      width: 1280, height: 820,
      background: "var(--bg)",
      display: "grid", gridTemplateColumns: "224px 1fr",
      fontFamily: "var(--sans)",
    }}>
      {/* Sidebar */}
      <SideNav lang={lang} active="interviews" />

      {/* Main */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "22px 32px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--bg)",
        }}>
          <div>
            <h1 className="rt-serif" style={{ fontSize: 34, margin: 0, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              {S.hr_interviews}
            </h1>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              {lang === "fr" ? "Aria a conduit 47 entretiens cette semaine" : "Aria ran 47 interviews this week"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="rt-btn rt-btn-ghost">
              {lang === "fr" ? "Exporter" : "Export"}
            </button>
            <button className="rt-btn rt-btn-accent">
              <PlusIcon size={14} /> {S.hr_new}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ padding: "20px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label={lang === "fr" ? "Cette semaine" : "This week"} value="47" trend="+12" color="terracotta" />
          <StatCard label={lang === "fr" ? "Présélectionnés" : "Shortlisted"} value="18" trend="+4" color="sage" />
          <StatCard label={lang === "fr" ? "Score moyen Aria" : "Avg Aria score"} value="76" unit="/100" color="plum" />
          <StatCard label={lang === "fr" ? "Temps économisé" : "Time saved"} value="38h" color="butter" />
        </div>

        {/* Filters */}
        <div style={{
          padding: "6px 32px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { k: "all", label: S.hr_filter_all, count: candidates.length },
              { k: "new", label: S.hr_status_new, count: 1 },
              { k: "review", label: S.hr_status_review, count: 3 },
              { k: "shortlist", label: S.hr_status_shortlist, count: 3 },
              { k: "declined", label: S.hr_status_declined, count: 1 },
            ].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: "1px solid " + (filter === f.k ? "var(--ink)" : "var(--border)"),
                  background: filter === f.k ? "var(--ink)" : "var(--surface)",
                  color: filter === f.k ? "var(--bg)" : "var(--ink)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                {f.label}
                <span style={{
                  fontSize: 11, opacity: 0.7,
                  padding: "1px 6px", borderRadius: 999,
                  background: filter === f.k ? "rgba(255,255,255,0.15)" : "var(--bg-deep)",
                }}>{f.count}</span>
              </button>
            ))}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            border: "1px solid var(--border)", background: "var(--surface)",
            borderRadius: 999, padding: "7px 14px", width: 240,
          }}>
            <SearchIcon size={14} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={S.hr_search}
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: 12.5, flex: 1, fontFamily: "inherit", color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, padding: "0 32px 32px", overflowY: "auto" }} className="rt-scroll">
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            overflow: "hidden",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 1.6fr 1.5fr 1.2fr 1fr 40px",
              padding: "12px 22px",
              fontSize: 11, color: "var(--muted)",
              textTransform: "uppercase", letterSpacing: "0.06em",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg)",
            }}>
              <span>{lang === "fr" ? "Candidat" : "Candidate"}</span>
              <span>{S.hr_filter_role}</span>
              <span>{lang === "fr" ? "État" : "Stage"}</span>
              <span>{S.hr_score}</span>
              <span>{lang === "fr" ? "Statut" : "Status"}</span>
              <span></span>
            </div>
            {filtered.map((c, i) => (
              <CandidateRow key={i} c={c} lang={lang} S={S} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SideNav({ lang, active }) {
  const items = [
    { k: "interviews", label: lang === "fr" ? "Entretiens" : "Interviews", icon: <ClockIcon size={16} /> },
    { k: "candidates", label: lang === "fr" ? "Candidats" : "Candidates", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg> },
    { k: "configs", label: lang === "fr" ? "Modèles" : "Templates", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 4v16"/></svg> },
    { k: "analytics", label: lang === "fr" ? "Analyses" : "Analytics", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M3 3v18h18M7 14l4-4 4 4 5-6"/></svg> },
    { k: "settings", label: lang === "fr" ? "Paramètres" : "Settings", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg> },
  ];
  return (
    <div style={{
      background: "var(--bg-deep)",
      borderRight: "1px solid var(--border)",
      padding: "22px 16px",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "0 8px 22px" }}>
        <Logo size={20} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(it => (
          <div key={it.k} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px",
            borderRadius: 12,
            background: active === it.k ? "var(--surface)" : "transparent",
            color: active === it.k ? "var(--ink)" : "var(--muted)",
            fontSize: 13,
            fontWeight: active === it.k ? 500 : 400,
            cursor: "pointer",
            border: "1px solid " + (active === it.k ? "var(--border)" : "transparent"),
          }}>
            {it.icon} {it.label}
          </div>
        ))}
      </div>

      {/* Aria quick status */}
      <div style={{
        marginTop: "auto",
        padding: 14,
        borderRadius: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <AriaOrb size={32} state="listening" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Aria</div>
            <div style={{ fontSize: 10.5, color: "var(--sage)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--sage)" }} />
              {lang === "fr" ? "3 entretiens actifs" : "3 active interviews"}
            </div>
          </div>
        </div>
        <button className="rt-btn" style={{
          width: "100%", fontSize: 11,
          background: "var(--bg)", border: "1px solid var(--border)",
          color: "var(--ink)",
          padding: "7px",
        }}>
          {lang === "fr" ? "Voir en direct" : "Watch live"}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, trend, color }) {
  const map = {
    terracotta: { bg: "var(--terracotta-soft)", fg: "var(--terracotta-deep)" },
    sage: { bg: "var(--sage-soft)", fg: "var(--sage)" },
    plum: { bg: "#EADFE6", fg: "var(--plum)" },
    butter: { bg: "#F5EBD2", fg: "#8F6B1E" },
  };
  const c = map[color];
  return (
    <div className="rt-card" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span className="rt-serif" style={{ fontSize: 36, color: "var(--ink)", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: "var(--muted)" }}>{unit}</span>}
        {trend && (
          <span style={{ fontSize: 11, color: c.fg, background: c.bg, padding: "2px 8px", borderRadius: 999, fontWeight: 500, marginLeft: "auto" }}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function CandidateRow({ c, lang, S }) {
  const statusStyles = {
    new: { bg: "var(--butter)", fg: "#8F6B1E", label: S.hr_status_new },
    review: { bg: "var(--terracotta-soft)", fg: "var(--terracotta-deep)", label: S.hr_status_review },
    shortlist: { bg: "var(--sage-soft)", fg: "var(--sage)", label: S.hr_status_shortlist },
    declined: { bg: "#EEE1DF", fg: "#8A5043", label: S.hr_status_declined },
  };
  const s = statusStyles[c.status];
  const stages = {
    intro: lang === "fr" ? "Présentation" : "Introduction",
    technical: lang === "fr" ? "Technique en cours" : "Technical ongoing",
    code: lang === "fr" ? "Code en cours" : "Coding ongoing",
    completed: lang === "fr" ? "Terminé" : "Completed",
  };
  const inProgress = c.stage !== "completed";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "2.2fr 1.6fr 1.5fr 1.2fr 1fr 40px",
      padding: "14px 22px",
      alignItems: "center",
      borderBottom: "1px solid var(--border)",
      fontSize: 13,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 999,
          background: c.avatar, color: "var(--ink)",
          display: "grid", placeItems: "center",
          fontSize: 12, fontWeight: 600,
          border: "1px solid rgba(0,0,0,0.05)",
        }}>{c.initials}</div>
        <div>
          <div style={{ fontWeight: 500, color: "var(--ink)" }}>{c.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.when}</div>
        </div>
      </div>
      <div style={{ color: "var(--ink-2)" }}>{c.role}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: inProgress ? "var(--terracotta-deep)" : "var(--muted)" }}>
        {inProgress && <LiveDot />}
        {stages[c.stage]}
      </div>
      <ScoreBar value={c.score} />
      <div>
        <span className="rt-pill" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
      </div>
      <button style={{
        background: "transparent", border: "none", color: "var(--muted)",
        cursor: "pointer", padding: 4, borderRadius: 8,
      }}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function ScoreBar({ value }) {
  const color = value >= 80 ? "var(--sage)" : value >= 65 ? "var(--terracotta)" : "#B94A3B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        flex: 1, maxWidth: 80,
        height: 5, borderRadius: 999,
        background: "var(--bg-deep)",
        overflow: "hidden",
      }}>
        <div style={{ width: value + "%", height: "100%", background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

Object.assign(window, { HRDashboard, SideNav });
