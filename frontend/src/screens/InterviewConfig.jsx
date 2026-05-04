import React from 'react';
import { Link } from 'react-router-dom';
import { STRINGS, AriaOrb, CheckIcon } from '../components/shared';
import { SideNav } from './HRDashboard';
import { api } from '../lib/api';

export function InterviewConfig({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];

  const [role, setRole] = React.useState("Senior Backend Engineer");
  const [duration, setDuration] = React.useState(45);
  const [seniority, setSeniority] = React.useState("senior");
  const [stages, setStages] = React.useState(["intro", "experience", "technical", "code"]);
  const [skills, setSkills] = React.useState(["Python", "PostgreSQL", "System design"]);
  const [tone, setTone] = React.useState("warm");
  const [cfgLang, setCfgLang] = React.useState(lang);
  const [company, setCompany] = React.useState("Lumen Labs");

  const [publishing, setPublishing] = React.useState(false);
  const [published, setPublished] = React.useState(null); // RoleOut
  const [error, setError] = React.useState(null);

  const allStages = [
    { k: "intro", label: lang === "fr" ? "Présentation" : "Introduction", min: 5 },
    { k: "experience", label: lang === "fr" ? "Expérience" : "Experience", min: 10 },
    { k: "technical", label: lang === "fr" ? "Technique" : "Technical", min: 15 },
    { k: "code", label: lang === "fr" ? "Code review" : "Code review", min: 10 },
    { k: "challenge", label: lang === "fr" ? "Live coding" : "Live coding", min: 25 },
    { k: "questions", label: lang === "fr" ? "Questions candidat" : "Candidate questions", min: 5 },
  ];
  const toggleStage = (k) => setStages((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const allSkills = ["Python", "JavaScript", "TypeScript", "Go", "Rust", "PostgreSQL", "Redis", "Kafka",
    "System design", "Distributed systems", "React", "Node.js", "AWS", "Kubernetes", "ML"];
  const toggleSkill = (s) => setSkills((ss) => (ss.includes(s) ? ss.filter((x) => x !== s) : [...ss, s]));

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const created = await api.createRole({
        title: role,
        seniority,
        company,
        duration_minutes: duration,
        language: cfgLang,
        tone,
        stages,
        skills,
      });
      setPublished(created);
    } catch (e) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = () => {
    if (!published) return;
    navigator.clipboard.writeText(published.share_url).catch(() => {});
  };

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, minHeight: 820,
        background: "var(--bg)",
        display: "grid", gridTemplateColumns: "224px 1fr",
        fontFamily: "var(--sans)",
      }}>
        <SideNav lang={lang} active="configs" />

        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "22px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 className="rt-serif" style={{ fontSize: 30, margin: 0, letterSpacing: "-0.01em" }}>{S.cfg_title}</h1>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {lang === "fr"
                  ? "Aria suivra ce plan pour chaque candidat du même poste."
                  : "Aria will follow this plan for every candidate for this role."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="rt-btn rt-btn-accent"
                disabled={publishing || published}
                onClick={publish}
              >
                <CheckIcon size={13} /> {publishing ? (lang === "fr" ? "Publication..." : "Publishing...") : S.cfg_publish}
              </button>
            </div>
          </div>

          {published && (
            <div style={{ padding: "16px 32px", background: "var(--sage-soft)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
              <CheckIcon size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sage)" }}>
                  {lang === "fr" ? "Lien d'entretien généré" : "Screening link generated"}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2, fontFamily: "var(--mono)" }}>
                  {published.share_url}
                </div>
              </div>
              <button onClick={copyLink} className="rt-btn rt-btn-ghost" style={{ fontSize: 12 }}>
                {lang === "fr" ? "Copier" : "Copy"}
              </button>
              <Link to={`/screening/${published.public_token}`} target="_blank" rel="noreferrer" className="rt-btn rt-btn-primary" style={{ fontSize: 12, textDecoration: "none" }}>
                {lang === "fr" ? "Tester" : "Test"}
              </Link>
              <Link to="/hr" className="rt-btn" style={{ fontSize: 12, background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--border)", textDecoration: "none" }}>
                {lang === "fr" ? "Voir les entretiens" : "See interviews"}
              </Link>
            </div>
          )}

          {error && (
            <div style={{ padding: "12px 32px", background: "var(--terracotta-soft)", color: "var(--terracotta-deep)", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 360px" }} className="rt-scroll">
            <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 22 }}>
              <CfgField label={S.cfg_role}>
                <input value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle} />
              </CfgField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <CfgField label={S.cfg_seniority}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[{ k: "junior", label: "Junior" }, { k: "mid", label: "Mid" }, { k: "senior", label: "Senior" }, { k: "staff", label: "Staff" }].map((s) => (
                      <CfgChip key={s.k} active={seniority === s.k} onClick={() => setSeniority(s.k)}>{s.label}</CfgChip>
                    ))}
                  </div>
                </CfgField>

                <CfgField label={S.cfg_language}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <CfgChip active={cfgLang === "fr"} onClick={() => setCfgLang("fr")}>🇫🇷 Français</CfgChip>
                    <CfgChip active={cfgLang === "en"} onClick={() => setCfgLang("en")}>🇬🇧 English</CfgChip>
                  </div>
                </CfgField>
              </div>

              <CfgField label={lang === "fr" ? "Entreprise" : "Company"}>
                <input value={company} onChange={(e) => setCompany(e.target.value)} style={inputStyle} />
              </CfgField>

              <CfgField label={`${S.cfg_duration} — ${duration} ${S.pre_minutes}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <input type="range" min={15} max={90} step={5} value={duration} onChange={(e) => setDuration(+e.target.value)} style={{ flex: 1, accentColor: "var(--terracotta)" }} />
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>15 – 90 {S.pre_minutes}</div>
                </div>
              </CfgField>

              <CfgField label={S.cfg_stages}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {allStages.map((s) => {
                    const active = stages.includes(s.k);
                    const idx = stages.indexOf(s.k);
                    return (
                      <div key={s.k} onClick={() => toggleStage(s.k)} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 14px",
                        background: active ? "var(--surface)" : "var(--bg-deep)",
                        border: "1px solid " + (active ? "var(--border)" : "transparent"),
                        borderRadius: 12, cursor: "pointer", opacity: active ? 1 : 0.55,
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 999,
                          background: active ? "var(--terracotta)" : "var(--border)",
                          color: "#FFF", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600,
                        }}>{active ? idx + 1 : "·"}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{s.label}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>~{s.min} {S.pre_minutes}</span>
                      </div>
                    );
                  })}
                </div>
              </CfgField>

              <CfgField label={S.cfg_skills} hint={`${skills.length} ${lang === "fr" ? "sélectionnées" : "selected"}`}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {allSkills.map((s) => (<CfgChip key={s} active={skills.includes(s)} onClick={() => toggleSkill(s)}>{s}</CfgChip>))}
                </div>
              </CfgField>

              <CfgField label={S.cfg_tone}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { k: "warm", label: lang === "fr" ? "Chaleureux" : "Warm", d: lang === "fr" ? "Accueillant, rassurant" : "Welcoming, reassuring" },
                    { k: "neutral", label: lang === "fr" ? "Neutre" : "Neutral", d: lang === "fr" ? "Professionnel, direct" : "Professional, direct" },
                    { k: "rigorous", label: lang === "fr" ? "Rigoureux" : "Rigorous", d: lang === "fr" ? "Exigeant, précis" : "Demanding, precise" },
                  ].map((t) => (
                    <div key={t.k} onClick={() => setTone(t.k)} style={{
                      padding: 14, borderRadius: 14,
                      background: tone === t.k ? "var(--terracotta-soft)" : "var(--surface)",
                      border: "1px solid " + (tone === t.k ? "var(--terracotta)" : "var(--border)"),
                      cursor: "pointer",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{t.d}</div>
                    </div>
                  ))}
                </div>
              </CfgField>
            </div>

            <div style={{ padding: "28px 32px 28px 0" }}>
              <div style={{ position: "sticky", top: 0, background: "var(--bg-deep)", borderRadius: 22, padding: 22, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <AriaOrb size={44} state="speaking" />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Aria</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{lang === "fr" ? "Aperçu du ton" : "Tone preview"}</div>
                  </div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                  <p className="rt-serif" style={{ fontSize: 17, lineHeight: 1.4, margin: 0, fontStyle: "italic", color: "var(--ink)" }}>
                    "{tone === "warm"
                      ? (cfgLang === "fr"
                        ? "Bonjour ! Je suis Aria. Prenez votre temps, il n'y a pas de mauvaises réponses — juste une conversation."
                        : "Hi there! I'm Aria. Take your time — there are no wrong answers, just a conversation.")
                      : tone === "neutral"
                      ? (cfgLang === "fr"
                        ? "Bonjour. Je suis Aria, je vais conduire votre entretien. Commençons par votre parcours."
                        : "Hello. I'm Aria, I'll be conducting your interview. Let's start with your background.")
                      : (cfgLang === "fr"
                        ? "Bonjour. Entretien technique rigoureux, 45 minutes. Présentez-vous en 90 secondes."
                        : "Hello. Rigorous technical interview, 45 minutes. Introduce yourself in 90 seconds.")
                    }"
                  </p>
                </div>

                <div style={{ marginTop: 18, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  {lang === "fr" ? "Résumé" : "Summary"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <CfgSummaryRow k={S.cfg_role} v={role} />
                  <CfgSummaryRow k={S.cfg_seniority} v={seniority} />
                  <CfgSummaryRow k={S.cfg_duration} v={`${duration} ${S.pre_minutes}`} />
                  <CfgSummaryRow k={S.cfg_stages} v={`${stages.length} ${lang === "fr" ? "étapes" : "stages"}`} />
                  <CfgSummaryRow k={S.cfg_skills} v={`${skills.length} ${lang === "fr" ? "compétences" : "skills"}`} />
                  <CfgSummaryRow k={S.cfg_language} v={cfgLang === "fr" ? "Français" : "English"} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CfgField({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: "var(--muted)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CfgChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 13px", borderRadius: 999,
      border: "1px solid " + (active ? "var(--ink)" : "var(--border)"),
      background: active ? "var(--ink)" : "var(--surface)",
      color: active ? "var(--bg)" : "var(--ink-2)",
      fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
    }}>{children}</button>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid var(--border)", background: "var(--surface)",
  fontSize: 14, fontFamily: "inherit", color: "var(--ink)", outline: "none",
};

function CfgSummaryRow({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <span style={{ color: "var(--ink)", fontWeight: 500, textTransform: "capitalize" }}>{v}</span>
    </div>
  );
}
