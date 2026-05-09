/**
 * CandidateExplanation — /candidate/explanation/:interviewToken
 *
 * Public-token route (no auth). Shows sanitized interview feedback to the candidate.
 *
 * NEVER renders: overall_score, skill_scores, skill_assessments, recommendation,
 * raw evidence quotes. The backend already strips these; we also defensively
 * skip them here in case of future shape changes.
 *
 * WCAG 2.2 AA:
 *   - Heading hierarchy: h1 → h2 → h3, no skipped levels
 *   - Contest modal: role="dialog" aria-modal aria-labelledby, focus trap, ESC closes
 *   - Contest textarea: aria-required, aria-invalid, aria-describedby
 *   - All interactive elements: aria-label or visible label
 *   - Color contrast: only CSS vars from the design system
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { STRINGS, Logo, AriaOrb, CheckIcon, XIcon, MessageSquareIcon } from '../components/shared';
import { api } from '../lib/api';

// ─── Focus trap hook ──────────────────────────────────────────────────────────

function useFocusTrap(ref, active) {
  React.useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const prevFocus = document.activeElement;
    first?.focus();
    function onKeyDown(e) {
      if (e.key !== 'Tab') return;
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last?.focus();
      }
    }
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
      prevFocus?.focus();
    };
  }, [ref, active]);
}

// ─── ContestModal ─────────────────────────────────────────────────────────────

function ContestModal({ token, lang, onClose }) {
  const S = STRINGS[lang];
  const [text, setText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState(null);
  const dialogRef = React.useRef(null);
  const titleId = React.useId();
  const textareaId = React.useId();
  const hintId = React.useId();
  useFocusTrap(dialogRef, true);

  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.contestEvaluation(token, text.trim());
      setDone(true);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: 28,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: 18, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
            {S.candidate_explanation_contest_modal_title}
          </h2>
          <button
            onClick={onClose}
            aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'grid', placeItems: 'center' }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 999,
              background: 'var(--sage-soft)', color: 'var(--sage)',
              display: 'grid', placeItems: 'center', margin: '0 auto 14px',
            }}>
              <CheckIcon size={20} />
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--ink)', lineHeight: 1.5 }}>
              {S.candidate_explanation_contest_success}
            </p>
            <button
              onClick={onClose}
              className="rt-btn rt-btn-primary"
              style={{ fontSize: 13, padding: '10px 24px' }}
            >
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor={textareaId}
                style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}
              >
                {lang === 'fr' ? 'Votre message' : 'Your message'}
              </label>
              <textarea
                id={textareaId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder={S.candidate_explanation_contest_placeholder}
                aria-required="true"
                aria-invalid={text.length > 0 && text.trim().length < 5}
                aria-describedby={hintId}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--ink)',
                  fontSize: 13, fontFamily: 'var(--sans)',
                  resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                }}
              />
              <p id={hintId} style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                {lang === 'fr'
                  ? 'Votre retour sera transmis au recruteur et à l\'équipe RecruteTech pour amélioration.'
                  : 'Your feedback will be forwarded to the recruiter and RecruteTech team for improvement.'}
              </p>
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                className="rt-btn rt-btn-ghost"
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                className="rt-btn rt-btn-primary"
                style={{ fontSize: 13, padding: '8px 16px', opacity: !text.trim() || submitting ? 0.5 : 1 }}
              >
                {submitting
                  ? (lang === 'fr' ? 'Envoi…' : 'Sending…')
                  : S.candidate_explanation_contest_submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Not-shared empty state ───────────────────────────────────────────────────

function NotSharedState({ S, lang }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 32px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 999,
        background: 'var(--terracotta-soft)',
        display: 'grid', placeItems: 'center', margin: '0 auto 20px',
      }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-deep)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2 style={{ margin: '0 0 10px', fontSize: 22, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
        {S.candidate_explanation_not_shared}
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
        {S.candidate_explanation_not_shared_help}
      </p>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CandidateExplanation({ lang = 'fr', theme = 'light' }) {
  const { interviewToken } = useParams();
  const S = STRINGS[lang];
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [notShared, setNotShared] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [showContest, setShowContest] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    api.getCandidateView(interviewToken)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e.status === 404) {
          setNotShared(true);
        } else {
          setError(e.message || 'Error');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [interviewToken]);

  // Derive safe fields. NEVER render score, skill_scores, skill_assessments,
  // recommendation, raw evidence (defensive — backend strips these already).
  const report = data?.report || data || null;
  const summary = typeof report?.summary === 'string' ? report.summary : null;
  const strengths = Array.isArray(report?.strengths) ? report.strengths : [];
  const gaps = Array.isArray(report?.gaps) ? report.gaps : [];
  const counterfactuals = Array.isArray(report?.counterfactuals) ? report.counterfactuals : [];
  const candidateLetter = report?.candidate_letter || null;

  // Safely extract actionable_advice from counterfactuals, grouped by skill_id
  const actionableBySkill = React.useMemo(() => {
    const map = {};
    counterfactuals.forEach((cf) => {
      if (!cf || typeof cf === 'string') return;
      if (!cf.actionable_advice) return;
      const key = cf.skill_id || 'general';
      if (!map[key]) map[key] = [];
      map[key].push(cf.actionable_advice);
    });
    return map;
  }, [counterfactuals]);

  const hasContent = summary || strengths.length > 0 || gaps.length > 0 || Object.keys(actionableBySkill).length > 0 || candidateLetter;

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        minHeight: '100vh', background: 'var(--bg)',
        fontFamily: 'var(--sans)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <header style={{
          padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <Logo size={22} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {lang === 'fr' ? 'Résultats d\'entretien' : 'Interview Results'}
          </span>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, maxWidth: 720, margin: '0 auto', width: '100%', padding: '48px 24px 64px' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)', fontSize: 14 }}>
              <AriaOrb size={60} state="thinking" />
              <p style={{ marginTop: 16 }}>{S.candidate_explanation_loading}</p>
            </div>
          )}

          {!loading && notShared && <NotSharedState S={S} lang={lang} />}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ fontSize: 14, color: 'var(--terracotta-deep)', marginBottom: 16 }}>
                {S.candidate_explanation_error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rt-btn rt-btn-ghost"
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                {S.candidate_explanation_retry}
              </button>
            </div>
          )}

          {!loading && !notShared && !error && hasContent && (
            <>
              {/* Page heading */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <AriaOrb size={52} state="idle" />
                  <div>
                    <h1 style={{ margin: 0, fontSize: 32, fontFamily: 'var(--serif)', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                      {S.candidate_explanation_title}
                    </h1>
                    {data?.candidate_name && (
                      <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--muted)' }}>
                        {data.candidate_name}
                      </p>
                    )}
                  </div>
                </div>

                {summary && (
                  <div style={{
                    padding: '18px 22px', borderRadius: 18,
                    background: 'var(--terracotta-soft)', border: '1px solid rgba(232,115,74,0.18)',
                  }}>
                    <p className="rt-serif" style={{ margin: 0, fontSize: 18, lineHeight: 1.5, color: 'var(--ink)' }}>
                      {summary}
                    </p>
                  </div>
                )}
              </div>

              {/* Strengths */}
              {strengths.length > 0 && (
                <section aria-labelledby="strengths-heading" style={{ marginBottom: 28 }}>
                  <h2 id="strengths-heading" style={{ margin: '0 0 14px', fontSize: 20, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                    {S.candidate_explanation_strengths}
                  </h2>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {strengths.map((s, i) => (
                      <li key={i} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '12px 16px', borderRadius: 12,
                        background: 'var(--sage-soft)', border: '1px solid rgba(46,93,79,0.15)',
                      }}>
                        <span style={{ color: 'var(--sage)', marginTop: 2, flexShrink: 0 }}>
                          <CheckIcon size={14} />
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Growth areas (gaps — softer language) */}
              {gaps.length > 0 && (
                <section aria-labelledby="growth-heading" style={{ marginBottom: 28 }}>
                  <h2 id="growth-heading" style={{ margin: '0 0 14px', fontSize: 20, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                    {S.candidate_explanation_growth}
                  </h2>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {gaps.map((g, i) => (
                      <li key={i} style={{
                        padding: '12px 16px', borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(251,230,190,0.5) 0%, rgba(168,199,184,0.2) 100%)',
                        border: '1px solid rgba(217,119,6,0.15)',
                        fontSize: 13, color: 'var(--ink)', lineHeight: 1.55,
                      }}>
                        {g}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Actionable advice grouped by skill */}
              {Object.keys(actionableBySkill).length > 0 && (
                <section aria-labelledby="actionable-heading" style={{ marginBottom: 28 }}>
                  <h2 id="actionable-heading" style={{ margin: '0 0 14px', fontSize: 20, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                    {S.candidate_explanation_actionable}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {Object.entries(actionableBySkill).map(([skillKey, advices]) => (
                      <div key={skillKey} style={{
                        padding: '14px 18px', borderRadius: 14,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                      }}>
                        {skillKey !== 'general' && (
                          <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {skillKey}
                          </h3>
                        )}
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {advices.map((a, i) => (
                            <li key={i} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>
                              {lang === 'fr' ? `Pour aller plus loin : ${a}` : `To grow further: ${a}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Candidate letter */}
              {candidateLetter && (
                <section aria-labelledby="letter-heading" style={{ marginBottom: 36 }}>
                  <h2 id="letter-heading" style={{ margin: '0 0 14px', fontSize: 20, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                    {S.candidate_explanation_letter}
                  </h2>
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: 'var(--surface)',
                  }}>
                    {/* Envelope header */}
                    <div style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--bg)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 999,
                        background: 'var(--terracotta-soft)',
                        display: 'grid', placeItems: 'center',
                        color: 'var(--terracotta-deep)',
                      }}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
                        {candidateLetter.subject}
                      </span>
                    </div>
                    <div style={{ padding: '22px 24px' }}>
                      <p
                        className="rt-serif"
                        style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}
                      >
                        {candidateLetter.body}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Contest button */}
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowContest(true)}
                  className="rt-btn rt-btn-ghost"
                  style={{ fontSize: 13, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  aria-label={S.candidate_explanation_contest}
                >
                  <MessageSquareIcon size={14} />
                  {S.candidate_explanation_contest}
                </button>
              </div>
            </>
          )}

          {/* Empty but loaded (no content yet) */}
          {!loading && !notShared && !error && !hasContent && (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <AriaOrb size={60} state="idle" />
              <p style={{ marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
                {lang === 'fr'
                  ? 'Les retours ne sont pas encore prêts. Revenez dans quelques instants.'
                  : 'Feedback is not ready yet. Check back in a moment.'}
              </p>
            </div>
          )}
        </main>
      </div>

      {showContest && (
        <ContestModal
          token={interviewToken}
          lang={lang}
          onClose={() => setShowContest(false)}
        />
      )}
    </div>
  );
}
