import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  STRINGS, Logo, AriaOrb, LiveDot,
  ClockIcon, SearchIcon, PlusIcon, ChevronRight, LayersIcon,
} from '../components/shared';
import { api } from '../lib/api';

export function HRDashboard({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const [interviews, setInterviews] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([api.listInterviews(), api.listRoles()])
      .then(([ivs, rls]) => { if (!cancelled) { setInterviews(ivs); setRoles(rls); } })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const filtered = interviews.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search && !c.candidate_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: interviews.length,
    in_progress: interviews.filter((i) => i.status === "in_progress").length,
    completed: interviews.filter((i) => i.status === "completed").length,
    pending: interviews.filter((i) => i.status === "pending").length,
  };
  const completedScores = interviews
    .map((i) => i.overall_score)
    .filter((s) => typeof s === "number");
  const avgScore = completedScores.length
    ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
    : null;

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, minHeight: 820,
        background: "var(--bg)",
        display: "grid", gridTemplateColumns: "224px 1fr",
        fontFamily: "var(--sans)",
      }}>
        <SideNav lang={lang} active="interviews" />

        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "22px 32px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)" }}>
            <div>
              <h1 className="rt-serif" style={{ fontSize: 34, margin: 0, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                {S.hr_interviews}
              </h1>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                {lang === "fr"
                  ? `${roles.length} modèle${roles.length > 1 ? "s" : ""} actif${roles.length > 1 ? "s" : ""} · ${interviews.length} entretien${interviews.length > 1 ? "s" : ""}`
                  : `${roles.length} active template${roles.length === 1 ? "" : "s"} · ${interviews.length} interview${interviews.length === 1 ? "" : "s"}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/hr/templates/new" className="rt-btn rt-btn-accent" style={{ textDecoration: "none" }}>
                <PlusIcon size={14} /> {S.hr_new}
              </Link>
            </div>
          </div>

          <div style={{ padding: "20px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <StatCard label={lang === "fr" ? "Total" : "Total"} value={String(interviews.length)} color="terracotta" />
            <StatCard label={lang === "fr" ? "Terminés" : "Completed"} value={String(counts.completed)} color="sage" />
            <StatCard label={lang === "fr" ? "En cours" : "In progress"} value={String(counts.in_progress)} color="butter" />
            <StatCard label={lang === "fr" ? "Score moyen" : "Avg score"} value={avgScore ?? "—"} unit={avgScore != null ? "/100" : ""} color="plum" />
          </div>

          <div style={{ padding: "6px 32px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { k: "all", label: S.hr_filter_all, count: counts.all },
                { k: "in_progress", label: lang === "fr" ? "En cours" : "Live", count: counts.in_progress },
                { k: "completed", label: lang === "fr" ? "Terminés" : "Completed", count: counts.completed },
                { k: "pending", label: lang === "fr" ? "En attente" : "Pending", count: counts.pending },
              ].map((f) => (
                <button key={f.k} onClick={() => setFilter(f.k)} style={{
                  padding: "7px 14px", borderRadius: 999,
                  border: "1px solid " + (filter === f.k ? "var(--ink)" : "var(--border)"),
                  background: filter === f.k ? "var(--ink)" : "var(--surface)",
                  color: filter === f.k ? "var(--bg)" : "var(--ink)",
                  fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {f.label}
                  <span style={{ fontSize: 11, opacity: 0.7, padding: "1px 6px", borderRadius: 999, background: filter === f.k ? "rgba(255,255,255,0.15)" : "var(--bg-deep)" }}>{f.count}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 999, padding: "7px 14px", width: 240 }}>
              <SearchIcon size={14} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={S.hr_search}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, flex: 1, fontFamily: "inherit", color: "var(--ink)" }} />
            </div>
          </div>

          <div style={{ flex: 1, padding: "0 32px 32px", overflowY: "auto" }} className="rt-scroll">
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.6fr 1.5fr 1.2fr 1fr 40px", padding: "12px 22px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                <span>{lang === "fr" ? "Candidat" : "Candidate"}</span>
                <span>{S.hr_filter_role}</span>
                <span>{lang === "fr" ? "État" : "Stage"}</span>
                <span>{S.hr_score}</span>
                <span>{lang === "fr" ? "Statut" : "Status"}</span>
                <span></span>
              </div>

              {loading && (<EmptyRow text={lang === "fr" ? "Chargement..." : "Loading..."} />)}
              {!loading && error && (<EmptyRow text={error} />)}
              {!loading && !error && filtered.length === 0 && (
                <EmptyRow text={
                  interviews.length === 0
                    ? (lang === "fr" ? "Aucun entretien encore. Créez un modèle et partagez le lien." : "No interviews yet. Create a template and share the link.")
                    : (lang === "fr" ? "Aucun résultat" : "No results")
                } />
              )}
              {filtered.map((iv) => (<CandidateRow key={iv.id} iv={iv} lang={lang} S={S} />))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SideNav({ lang, active, roleId }) {
  const items = [
    { k: "interviews", to: "/hr", label: lang === "fr" ? "Entretiens" : "Interviews", icon: <ClockIcon size={16} /> },
    { k: "configs", to: "/hr/templates/new", label: lang === "fr" ? "Modèles" : "Templates", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 4v16"/></svg> },
    { k: "rubrics", to: roleId ? `/hr/roles/${roleId}/rubrics` : "/hr", label: lang === "fr" ? "Rubriques" : "Rubrics", icon: <LayersIcon size={16} /> },
  ];
  return (
    <div style={{ background: "var(--bg-deep)", borderRight: "1px solid var(--border)", padding: "22px 16px", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0 8px 22px" }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}><Logo size={20} /></Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const isActive = active === it.k;
          return (
            <Link key={it.k} to={it.to} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 12,
              background: isActive ? "var(--surface)" : "transparent",
              color: isActive ? "var(--ink)" : "var(--muted)",
              fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: "pointer",
              border: "1px solid " + (isActive ? "var(--border)" : "transparent"),
              textDecoration: "none",
            }}>
              {it.icon} {it.label}
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: "auto", padding: 14, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <AriaOrb size={32} state="listening" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Aria</div>
            <div style={{ fontSize: 10.5, color: "var(--sage)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--sage)" }} />
              {lang === "fr" ? "via ElevenLabs" : "via ElevenLabs"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
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
        <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: 999, background: c.fg }} />
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div style={{ padding: "32px 22px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>{text}</div>
  );
}

function CandidateRow({ iv, lang, S }) {
  const navigate = useNavigate();
  const statusStyles = {
    pending: { bg: "var(--bg-deep)", fg: "var(--muted)", label: lang === "fr" ? "En attente" : "Pending" },
    in_progress: { bg: "var(--terracotta-soft)", fg: "var(--terracotta-deep)", label: lang === "fr" ? "En cours" : "Live" },
    completed: { bg: "var(--sage-soft)", fg: "var(--sage)", label: lang === "fr" ? "Terminé" : "Completed" },
    error: { bg: "#EEE1DF", fg: "#8A5043", label: lang === "fr" ? "Erreur" : "Error" },
  };
  const s = statusStyles[iv.status] || statusStyles.pending;
  const inProgress = iv.status === "in_progress";
  const initials = (iv.candidate_name || "?").split(" ").slice(0, 2).map((s) => s[0] || "").join("").toUpperCase();
  const when = iv.started_at ? new Date(iv.started_at).toLocaleString() : "—";

  return (
    <div onClick={() => navigate(`/hr/candidates/${iv.public_token}`)}
      style={{ display: "grid", gridTemplateColumns: "2.2fr 1.6fr 1.5fr 1.2fr 1fr 40px", padding: "14px 22px", alignItems: "center", borderBottom: "1px solid var(--border)", fontSize: 13, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: "#E8C9B4", color: "var(--ink)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}>{initials || "?"}</div>
        <div>
          <div style={{ fontWeight: 500, color: "var(--ink)" }}>{iv.candidate_name || iv.candidate_email}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{when}</div>
        </div>
      </div>
      <div style={{ color: "var(--ink-2)" }}>{iv.role_title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: inProgress ? "var(--terracotta-deep)" : "var(--muted)" }}>
        {inProgress && <LiveDot />}
        {s.label}
      </div>
      <ScoreBar value={iv.overall_score} />
      <div><span className="rt-pill" style={{ background: s.bg, color: s.fg }}>{s.label}</span></div>
      <button style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, borderRadius: 8 }}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function ScoreBar({ value }) {
  if (value == null) {
    return <div style={{ fontSize: 12, color: "var(--muted)" }}>—</div>;
  }
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 80 ? "var(--sage)" : v >= 65 ? "var(--terracotta)" : "#B94A3B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, maxWidth: 80, height: 5, borderRadius: 999, background: "var(--bg-deep)", overflow: "hidden" }}>
        <div style={{ width: v + "%", height: "100%", background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>{Math.round(v)}</span>
    </div>
  );
}
