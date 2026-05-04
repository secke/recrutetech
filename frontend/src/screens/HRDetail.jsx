import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { STRINGS, AriaOrb, ChevronRight, DownloadIcon, CheckIcon } from '../components/shared';
import { SideNav } from './HRDashboard';
import { api } from '../lib/api';

export function HRDetail({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];
  const { interviewToken } = useParams();
  const [iv, setIv] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    api.getInterview(interviewToken)
      .then((d) => { if (!cancelled) setIv(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [interviewToken]);

  const initials = (iv?.candidate_name || "?").split(" ").slice(0, 2).map((s) => s[0] || "").join("").toUpperCase();
  const report = iv?.report || null;
  const summaryText = report?.summary || iv?.analysis?.transcript_summary || iv?.analysis?.summary || null;
  const score = iv?.overall_score; // backend now prefers report.overall_score
  const recommendationLabel = (rec) => {
    const map = lang === 'fr'
      ? { strong_yes: 'Recommandé fortement', yes: 'Recommandé', maybe: 'À considérer', no: 'Pas recommandé', strong_no: 'Refuser' }
      : { strong_yes: 'Strong yes', yes: 'Yes', maybe: 'Maybe', no: 'No', strong_no: 'Strong no' };
    return map[rec] || rec;
  };
  const recommendationColor = (rec) => {
    if (rec === 'strong_yes' || rec === 'yes') return { bg: 'var(--sage-soft)', fg: 'var(--sage)' };
    if (rec === 'maybe') return { bg: '#FBE6BE', fg: '#8C5E0F' };
    return { bg: 'var(--terracotta-soft)', fg: 'var(--terracotta-deep)' };
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/interviews/${interviewToken}/export?format=json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview_${interviewToken}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
  };

  const handleRegenerate = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/interviews/${interviewToken}/generate-report`, { method: 'POST' });
      // Refetch in 4s to give the background task a head start
      setTimeout(() => api.getInterview(interviewToken).then(setIv).catch(() => {}), 4000);
    } catch (e) { setError(e.message); }
  };

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
          <div style={{ padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Link to="/hr" style={{ color: "var(--muted)", textDecoration: "none" }}>{S.hr_interviews}</Link>
              <ChevronRight size={12} />
              <span style={{ color: "var(--ink)" }}>{iv?.candidate_name || "—"}</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {iv?.transcript?.length > 0 && !report && (
                <button onClick={handleRegenerate} className="rt-btn rt-btn-ghost" style={{ fontSize: 12, padding: "8px 14px" }}>
                  {lang === 'fr' ? "Générer le rapport" : "Generate report"}
                </button>
              )}
              <button onClick={handleDownload} className="rt-btn rt-btn-ghost" style={{ fontSize: 12, padding: "8px 14px" }}>
                <DownloadIcon size={13} /> {S.det_download}
              </button>
              <button className="rt-btn rt-btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}>
                <CheckIcon size={13} /> {S.det_shortlist}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }} className="rt-scroll">
            {loading && <div style={{ padding: 32, color: "var(--muted)" }}>Loading...</div>}
            {error && <div style={{ padding: 32, color: "var(--terracotta-deep)" }}>{error}</div>}
            {iv && (
              <>
                <div style={{ padding: "28px 32px 24px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <div style={{ width: 76, height: 76, borderRadius: 999, background: "#E8C9B4", color: "var(--ink)", display: "grid", placeItems: "center", fontSize: 26, fontWeight: 500 }}>{initials || "?"}</div>
                    <div>
                      <h1 className="rt-serif" style={{ fontSize: 36, margin: 0, letterSpacing: "-0.01em" }}>{iv.candidate_name}</h1>
                      <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
                        {iv.role_title} · {iv.candidate_email}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <span className="rt-pill" style={{
                          background: iv.status === "completed" ? "var(--sage-soft)" : "var(--terracotta-soft)",
                          color: iv.status === "completed" ? "var(--sage)" : "var(--terracotta-deep)",
                        }}>
                          {iv.status === "completed" ? <CheckIcon size={11} /> : null} {iv.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 22, padding: 20, display: "flex", alignItems: "center", gap: 18 }}>
                    <AriaOrb size={64} state="idle" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{S.hr_score}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                        <span className="rt-serif" style={{ fontSize: 44, lineHeight: 1, color: "var(--ink)" }}>
                          {score != null ? score.toFixed(1) : "—"}
                        </span>
                        {score != null && <span style={{ fontSize: 14, color: "var(--muted)" }}>/10</span>}
                      </div>
                      {report?.hiring_recommendation && (
                        <span className="rt-pill" style={{
                          marginTop: 8,
                          background: recommendationColor(report.hiring_recommendation).bg,
                          color: recommendationColor(report.hiring_recommendation).fg,
                          fontSize: 11,
                        }}>
                          {recommendationLabel(report.hiring_recommendation)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {summaryText && (
                  <div style={{ padding: "0 32px 24px" }}>
                    <div style={{ background: "var(--terracotta-soft)", borderRadius: 22, padding: "22px 26px", border: "1px solid rgba(232,115,74,0.18)", display: "flex", gap: 18, alignItems: "flex-start" }}>
                      <AriaOrb size={40} state="idle" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--terracotta-deep)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                          {lang === "fr" ? "Synthèse d'Aria" : "Aria's summary"}
                        </div>
                        <p className="rt-serif" style={{ fontSize: 22, lineHeight: 1.35, margin: 0, color: "var(--ink)", maxWidth: 860 }}>
                          {summaryText}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {report && (
                  <div style={{ padding: "0 32px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {report.strengths?.length > 0 && (
                      <div className="rt-card" style={{ padding: 22 }}>
                        <div className="rt-serif" style={{ fontSize: 18, marginBottom: 12 }}>
                          {lang === 'fr' ? 'Points forts' : 'Strengths'}
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                          {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {report.gaps?.length > 0 && (
                      <div className="rt-card" style={{ padding: 22 }}>
                        <div className="rt-serif" style={{ fontSize: 18, marginBottom: 12 }}>
                          {lang === 'fr' ? 'Axes de progrès' : 'Gaps'}
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                          {report.gaps.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>
                    )}
                    {report.skill_assessments?.length > 0 && (
                      <div className="rt-card" style={{ padding: 22, gridColumn: '1 / -1' }}>
                        <div className="rt-serif" style={{ fontSize: 18, marginBottom: 12 }}>
                          {lang === 'fr' ? 'Évaluation par compétence' : 'Skill assessments'}
                        </div>
                        <div style={{ display: 'grid', gap: 10 }}>
                          {report.skill_assessments.map((sa, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 60px 1fr', gap: 14, alignItems: 'baseline' }}>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{sa.skill}</div>
                              <div className="rt-serif" style={{ fontSize: 18 }}>
                                {typeof sa.score === 'number' ? sa.score.toFixed(1) : '—'}
                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>/10</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{sa.notes}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(report.communication || report.engagement) && (
                      <div className="rt-card" style={{ padding: 22, gridColumn: '1 / -1' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                          {report.communication && (
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                {lang === 'fr' ? 'Communication' : 'Communication'}
                              </div>
                              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>{report.communication}</div>
                            </div>
                          )}
                          {report.engagement && (
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                {lang === 'fr' ? 'Engagement' : 'Engagement'}
                              </div>
                              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>{report.engagement}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: "0 32px 32px" }}>
                  <div className="rt-card" style={{ padding: 22 }}>
                    <div className="rt-serif" style={{ fontSize: 20, marginBottom: 16 }}>
                      {S.det_transcript}
                    </div>
                    {iv.transcript.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>
                        {lang === "fr" ? "Transcription en cours de traitement..." : "Transcript is being processed..."}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {iv.transcript.map((t, i) => (
                          <Turn key={i} t={t} lang={lang} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {iv.visual_metrics && (
                  <div style={{ padding: "0 32px 32px" }}>
                    <div className="rt-card" style={{ padding: 22 }}>
                      <div className="rt-serif" style={{ fontSize: 20, marginBottom: 16 }}>
                        {lang === "fr" ? "Indicateurs visuels" : "Visual indicators"}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        {Object.entries(iv.visual_metrics).map(([k, v]) =>
                          typeof v === "number" ? (
                            <Metric key={k} label={k} value={(v * 100).toFixed(0) + "%"} />
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Turn({ t, lang }) {
  const isAria = t.role === "agent" || t.role === "ai" || t.role === "aria";
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 26, height: 26, borderRadius: 999,
        background: isAria ? "var(--terracotta-soft)" : "var(--sage-soft)",
        color: isAria ? "var(--terracotta-deep)" : "var(--sage)",
        display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flexShrink: 0,
      }}>{isAria ? "A" : (lang === "fr" ? "C" : "C")}</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", marginBottom: 3 }}>
          {isAria ? "Aria" : (lang === "fr" ? "Candidat" : "Candidate")}
          {t.time_in_call_secs != null && (
            <span style={{ marginLeft: 6, fontFamily: "var(--mono)" }}>
              {String(Math.floor(t.time_in_call_secs / 60)).padStart(2, "0")}:{String(Math.floor(t.time_in_call_secs % 60)).padStart(2, "0")}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)" }}>{t.text}</div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div className="rt-serif" style={{ fontSize: 28, color: "var(--ink)", lineHeight: 1, marginTop: 4 }}>{value}</div>
    </div>
  );
}
