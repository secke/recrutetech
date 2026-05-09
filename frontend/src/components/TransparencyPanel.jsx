/**
 * TransparencyPanel — "Why this score?" HR panel
 *
 * Renders below the existing HRDetail report summary.
 * Three subsections:
 *   a) Per-skill evidence timeline
 *   b) Counterfactuals
 *   c) HR controls (override + share toggle)
 *
 * WCAG 2.2 AA compliant:
 *   - All modals: role="dialog" aria-modal aria-labelledby aria-describedby, focus trap, ESC closes
 *   - Override slider: aria-valuemin/max/now, associated label
 *   - Justification textarea: aria-required, aria-describedby, aria-invalid
 *   - Share toggle: role="switch" aria-checked
 *   - Timestamp buttons: aria-label
 *   - Heading hierarchy maintained
 */

import React from 'react';
import { STRINGS, AlertTriangleIcon, SlidersIcon, ShareIcon, ClockIcon, CodeIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from './shared';
import { api } from '../lib/api';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(secs) {
  if (secs == null || isNaN(secs)) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ScoreBar({ score, max = 5 }) {
  const pct = Math.min(100, Math.max(0, ((score ?? 0) / max) * 100));
  const color = pct >= 70 ? 'var(--sage)' : pct >= 40 ? '#D97706' : 'var(--terracotta-deep)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        role="progressbar"
        aria-valuenow={score ?? 0}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Score ${score ?? 0} sur ${max}`}
        style={{
          flex: 1, height: 7, borderRadius: 999,
          background: 'var(--border)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', minWidth: 36, textAlign: 'right', fontFamily: 'var(--mono)' }}>
        {score != null ? score.toFixed(1) : '—'}<span style={{ fontSize: 10, color: 'var(--muted)' }}>/5</span>
      </span>
    </div>
  );
}

function EvidenceTypeIcon({ type }) {
  if (type === 'code_event' || type === 'code') return <CodeIcon size={13} />;
  if (type === 'visual_metric') return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" />
    </svg>
  );
  // transcript (default)
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function evidenceTypeLabel(type, S) {
  if (type === 'code_event' || type === 'code') return S.transparency_evidence_type_code;
  if (type === 'visual_metric') return S.transparency_evidence_type_visual;
  return S.transparency_evidence_type_transcript;
}

// ─── FocusTrap ────────────────────────────────────────────────────────────────

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

// ─── OverrideModal ────────────────────────────────────────────────────────────

function OverrideModal({ skills, token, onClose, onSuccess, lang }) {
  const S = STRINGS[lang];
  const [skillId, setSkillId] = React.useState(skills[0]?.skill_id || skills[0]?.skill || '');
  const [overrideScore, setOverrideScore] = React.useState(2.5);
  const [justification, setJustification] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const dialogRef = React.useRef(null);
  const titleId = React.useId();
  const descId = React.useId();
  const justId = React.useId();
  const justHintId = React.useId();
  useFocusTrap(dialogRef, true);

  const justLen = justification.trim().length;
  const isValid = justLen >= 30 && skillId;

  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.overrideEvaluation(token, {
        skill_id: skillId,
        override_score: overrideScore,
        justification: justification.trim(),
      });
      onSuccess(result);
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
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: 28,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: 18, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
            {S.transparency_override_modal_title}
          </h2>
          <button
            onClick={onClose}
            aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', padding: 4, display: 'grid', placeItems: 'center',
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        <p id={descId} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
          {lang === 'fr'
            ? 'Toute modification est enregistrée de façon permanente pour audit. Vous devez fournir une justification (≥ 30 caractères).'
            : 'All overrides are permanently logged for audit. You must provide a justification (≥ 30 characters).'}
        </p>

        {/* Skill selector */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="override-skill"
            style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}
          >
            {S.transparency_override_skill_label}
          </label>
          <select
            id="override-skill"
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--sans)',
            }}
          >
            {skills.map((sa) => {
              const id = sa.skill_id || sa.skill || sa.name || '';
              return <option key={id} value={id}>{sa.skill || sa.name || id}</option>;
            })}
          </select>
        </div>

        {/* Score slider */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="override-score"
            style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}
          >
            {S.transparency_override_score_label}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              id="override-score"
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={overrideScore}
              onChange={(e) => setOverrideScore(parseFloat(e.target.value))}
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={overrideScore}
              aria-label={S.transparency_override_score_label}
              style={{ flex: 1, accentColor: 'var(--terracotta-deep)' }}
            />
            <span
              style={{
                fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)',
                color: 'var(--ink)', minWidth: 40, textAlign: 'right',
              }}
            >
              {overrideScore.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Justification */}
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor={justId}
            style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}
          >
            {S.transparency_override_justification_label}
          </label>
          <textarea
            id={justId}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
            aria-required="true"
            aria-invalid={justLen > 0 && justLen < 30}
            aria-describedby={justHintId}
            placeholder={lang === 'fr'
              ? 'Ex. : Le candidat a montré de l\'expérience pertinente non capturée dans la transcription…'
              : 'E.g. The candidate showed relevant experience not captured in the transcript…'}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: `1px solid ${justLen > 0 && justLen < 30 ? 'var(--terracotta-deep)' : 'var(--border)'}`,
              background: 'var(--bg)', color: 'var(--ink)', fontSize: 13,
              fontFamily: 'var(--sans)', resize: 'vertical', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <div id={justHintId} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11 }}>
            <span style={{ color: justLen < 30 ? 'var(--terracotta-deep)' : 'var(--sage)' }}>
              {S.transparency_override_justification_min_chars}
            </span>
            <span style={{ color: 'var(--muted)' }}>{justLen} / 30</span>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 8, background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)', fontSize: 12 }}>
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
            disabled={!isValid || submitting}
            className="rt-btn rt-btn-primary"
            style={{ fontSize: 13, padding: '8px 16px', opacity: !isValid || submitting ? 0.5 : 1 }}
          >
            {submitting
              ? (lang === 'fr' ? 'Enregistrement…' : 'Saving…')
              : S.transparency_override_submit}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ContestModal (reused in candidate page) ─────────────────────────────────
// exported separately

// ─── SkillEvidenceCard ────────────────────────────────────────────────────────

function SkillEvidenceCard({ sa, evidence, lang, unverified }) {
  const S = STRINGS[lang];
  // evidence items for this skill
  const skillId = sa.skill_id || sa.skill || sa.name || '';
  const items = (evidence || []).filter((ev) =>
    ev.supports_skill === skillId || ev.supports_skill === sa.skill || ev.supports_skill === sa.name
  );

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* Card header */}
      <div style={{ padding: '16px 20px', borderBottom: items.length > 0 ? '1px solid var(--border)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
            {sa.skill || sa.name || skillId}
          </h3>
          {sa.matched_level && (
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 999,
              background: 'var(--sage-soft)', color: 'var(--sage)',
              fontWeight: 600, letterSpacing: '0.04em',
            }}>
              {sa.matched_level}
            </span>
          )}
        </div>
        <ScoreBar score={sa.score} max={5} />
        {sa.notes && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{sa.notes}</p>
        )}
      </div>

      {/* Evidence timeline */}
      {items.length > 0 && (
        <div style={{ padding: '14px 20px' }}>
          {unverified && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '8px 12px', borderRadius: 10,
              background: '#FEF9C3', border: '1px solid #FDE047',
              color: '#78350F', fontSize: 12, marginBottom: 14, lineHeight: 1.4,
            }}
              role="alert"
            >
              <AlertTriangleIcon size={14} />
              <span>{S.transparency_evidence_unverified_warning}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {items.map((ev, idx) => (
              <EvidenceItem key={idx} ev={ev} lang={lang} isLast={idx === items.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceItem({ ev, lang, isLast }) {
  const S = STRINGS[lang];
  const contribution = ev.score_contribution ?? 0;
  const positive = contribution >= 0;
  const contribLabel = positive ? `+${contribution.toFixed(1)}` : contribution.toFixed(1);
  const contribColor = positive ? 'var(--sage)' : 'var(--terracotta-deep)';

  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 16 }}>
      {/* Timeline vertical line + dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'var(--surface)', border: '2px solid var(--border)',
          display: 'grid', placeItems: 'center',
          color: 'var(--muted)',
        }}>
          <EvidenceTypeIcon type={ev.evidence_type} />
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 16 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 2, paddingBottom: isLast ? 0 : 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>
            {ev.claim}
          </p>
          <span style={{
            fontSize: 12, fontWeight: 700, color: contribColor,
            fontFamily: 'var(--mono)', flexShrink: 0,
          }}>
            {contribLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {evidenceTypeLabel(ev.evidence_type, S)}
          </span>
          {ev.timestamp_seconds != null && (
            <button
              onClick={() => console.log('seek to', ev.timestamp_seconds)}
              aria-label={lang === 'fr'
                ? `Aller à ${formatTimestamp(ev.timestamp_seconds)} dans l'entretien`
                : `Seek to ${formatTimestamp(ev.timestamp_seconds)} in the interview`}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                cursor: 'pointer', color: 'var(--muted)', fontSize: 11,
                padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 4,
                fontFamily: 'var(--mono)',
              }}
            >
              <ClockIcon size={11} /> {formatTimestamp(ev.timestamp_seconds)}
            </button>
          )}
        </div>

        {ev.evidence_type === 'transcript' && ev.quote && (
          <blockquote style={{
            margin: '0 0 0 0', padding: '6px 10px',
            borderLeft: '3px solid var(--terracotta-soft)',
            fontSize: 12, fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.5,
            background: 'rgba(0,0,0,0.02)', borderRadius: '0 6px 6px 0',
          }}>
            "{ev.quote}"
          </blockquote>
        )}

        {(ev.evidence_type === 'code_event' || ev.evidence_type === 'code') && ev.details && (
          <pre style={{
            margin: 0, padding: '6px 10px',
            background: 'var(--surface)', borderRadius: 6,
            fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-2)',
            overflowX: 'auto', lineHeight: 1.4,
          }}>
            {ev.details}
          </pre>
        )}

        {ev.evidence_type === 'visual_metric' && ev.details && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{ev.details}</p>
        )}
      </div>
    </div>
  );
}

// ─── CounterfactualsSection ───────────────────────────────────────────────────

function CounterfactualsSection({ counterfactuals, lang }) {
  const S = STRINGS[lang];
  if (!counterfactuals?.length) return null;

  return (
    <section aria-labelledby="counterfactuals-heading" style={{ marginBottom: 28 }}>
      <h2
        id="counterfactuals-heading"
        style={{ fontSize: 18, fontFamily: 'var(--serif)', color: 'var(--ink)', margin: '0 0 16px' }}
      >
        {S.transparency_counterfactuals_title}
      </h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {counterfactuals.map((cf, i) => {
          // Handle both string and structured counterfactual shapes
          if (typeof cf === 'string') {
            return (
              <div
                key={i}
                style={{
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(251,230,190,0.6) 0%, rgba(168,199,184,0.35) 100%)',
                  border: '1px solid rgba(217,119,6,0.2)',
                  fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55,
                }}
              >
                {cf}
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(251,230,190,0.6) 0%, rgba(168,199,184,0.35) 100%)',
                border: '1px solid rgba(217,119,6,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {cf.skill_id && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(217,119,6,0.12)', color: '#92400E',
                    fontWeight: 600,
                  }}>
                    {cf.skill_id}
                  </span>
                )}
                {cf.current_level && cf.target_level && (
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {cf.current_level} → {cf.target_level}
                  </span>
                )}
              </div>
              {cf.gap_description && (
                <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, fontWeight: 500 }}>
                  {cf.gap_description}
                </p>
              )}
              {cf.actionable_advice && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  {cf.actionable_advice}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── HRControlsSection ───────────────────────────────────────────────────────

function HRControlsSection({ token, report, interviewToken, lang, onReload }) {
  const S = STRINGS[lang];
  const [showOverrideModal, setShowOverrideModal] = React.useState(false);
  const [sharing, setSharing] = React.useState(report?.share_with_candidate ?? false);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareError, setShareError] = React.useState(null);
  const [overrideToast, setOverrideToast] = React.useState(null);
  const [showPrevOverrides, setShowPrevOverrides] = React.useState(false);
  const [prevOverrides, setPrevOverrides] = React.useState([]);

  // Derive sharing state from the interview-level field on mount/reload
  React.useEffect(() => {
    if (token?.share_with_candidate != null) {
      setSharing(token.share_with_candidate);
    }
  }, [token]);

  const skills = report?.skill_assessments || [];
  const candidateUrl = `${window.location.origin}/candidate/explanation/${interviewToken}`;

  async function handleShareToggle() {
    const newVal = !sharing;
    setShareLoading(true);
    setShareError(null);
    try {
      await api.shareWithCandidate(interviewToken, newVal);
      setSharing(newVal);
    } catch (e) {
      setShareError(e.message || 'Error');
    } finally {
      setShareLoading(false);
    }
  }

  function handleOverrideSuccess(row) {
    setShowOverrideModal(false);
    setOverrideToast(S.transparency_override_success);
    setPrevOverrides((prev) => [row, ...prev]);
    setTimeout(() => setOverrideToast(null), 4000);
    onReload?.();
  }

  const modelVersion = report?.model_version;

  return (
    <section aria-labelledby="hr-controls-heading" style={{ marginBottom: 28 }}>
      <h2
        id="hr-controls-heading"
        style={{ fontSize: 18, fontFamily: 'var(--serif)', color: 'var(--ink)', margin: '0 0 16px' }}
      >
        {lang === 'fr' ? 'Contrôles RH' : 'HR Controls'}
      </h2>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Override + Share row */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start',
          padding: '18px 20px',
          border: '1px solid var(--border)', borderRadius: 18,
          background: 'var(--bg)',
        }}>
          {/* Override button */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
              {lang === 'fr' ? 'Modifier un score de compétence' : 'Override a skill score'}
            </p>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              {lang === 'fr'
                ? 'Toute modification est enregistrée de façon permanente pour audit.'
                : 'All overrides are permanently logged for audit.'}
            </p>
            <button
              onClick={() => setShowOverrideModal(true)}
              disabled={skills.length === 0}
              className="rt-btn rt-btn-ghost"
              style={{
                fontSize: 12, padding: '8px 14px',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                opacity: skills.length === 0 ? 0.5 : 1,
              }}
            >
              <SlidersIcon size={13} />
              {S.transparency_override_button}
            </button>
          </div>

          {/* Share toggle */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
              {S.transparency_share_toggle}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                role="switch"
                aria-checked={sharing}
                aria-label={S.transparency_share_toggle}
                onClick={handleShareToggle}
                disabled={shareLoading}
                style={{
                  width: 44, height: 24, borderRadius: 999,
                  background: sharing ? 'var(--sage)' : 'var(--border)',
                  border: 'none', cursor: shareLoading ? 'not-allowed' : 'pointer',
                  position: 'relative', transition: 'background 0.2s',
                  opacity: shareLoading ? 0.6 : 1,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: sharing ? 23 : 3,
                  width: 18, height: 18, borderRadius: 999, background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                }} />
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {sharing ? S.transparency_share_on : S.transparency_share_off}
              </span>
            </div>
            {shareError && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--terracotta-deep)' }}>{shareError}</p>
            )}
            {sharing && (
              <div style={{ marginTop: 10 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {S.transparency_candidate_url}
                </p>
                <a
                  href={candidateUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12, color: 'var(--sage)', wordBreak: 'break-all',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {candidateUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Previous overrides (expandable) */}
        {prevOverrides.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--bg)' }}>
            <button
              onClick={() => setShowPrevOverrides((v) => !v)}
              aria-expanded={showPrevOverrides}
              style={{
                width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)',
              }}
            >
              <span>{S.transparency_previous_overrides} ({prevOverrides.length})</span>
              {showPrevOverrides ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
            </button>
            {showPrevOverrides && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {prevOverrides.map((ov, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{ov.skill_id}</span>
                    <span style={{ color: 'var(--muted)', marginLeft: 8 }}>→ {ov.override_score ?? ov.effective_score}</span>
                    {ov.created_at && (
                      <span style={{ color: 'var(--muted)', marginLeft: 8, fontFamily: 'var(--mono)' }}>
                        {new Date(ov.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                      </span>
                    )}
                    <p style={{ margin: '2px 0 0', color: 'var(--ink-2)' }}>
                      {ov.justification?.slice(0, 100)}{ov.justification?.length > 100 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Model version */}
        {modelVersion && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, fontFamily: 'var(--mono)',
          }}>
            <strong style={{ fontFamily: 'var(--sans)', color: 'var(--ink)' }}>
              {S.transparency_model_version}
            </strong>
            {' · '}
            {modelVersion.evaluator_model}
            {modelVersion.rubric_version && ` · rubric ${modelVersion.rubric_version}`}
            {modelVersion.evaluated_at && ` · ${new Date(modelVersion.evaluated_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')}`}
          </div>
        )}
      </div>

      {/* Toast */}
      {overrideToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
            background: 'var(--sage)', color: '#fff',
            padding: '12px 20px', borderRadius: 12,
            fontSize: 13, fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <CheckIcon size={14} /> {overrideToast}
        </div>
      )}

      {showOverrideModal && (
        <OverrideModal
          skills={skills}
          token={token}
          interviewToken={interviewToken}
          onClose={() => setShowOverrideModal(false)}
          onSuccess={handleOverrideSuccess}
          lang={lang}
        />
      )}
    </section>
  );
}

// ─── TransparencyPanel (main export) ─────────────────────────────────────────

/**
 * Props:
 *   report        — the v3 evaluation report_json object
 *   interviewToken — public token string
 *   interview     — full interview object (for share_with_candidate field)
 *   lang          — 'fr' | 'en'
 *   onReload      — callback to refetch the interview
 */
export function TransparencyPanel({ report, interviewToken, interview, lang = 'fr', onReload }) {
  const S = STRINGS[lang];

  if (!report) return null;

  // Normalise evidence field: spec calls it `evidence`, SKILL.md calls it `evidence_pointers`
  const evidence = report.evidence || report.evidence_pointers || [];
  const counterfactuals = report.counterfactuals || [];
  const skillAssessments = report.skill_assessments || [];
  const unverified = report.evidence_verified === false;

  return (
    <div
      aria-label={S.transparency_why_panel_title}
      style={{ padding: '0 32px 40px' }}
    >
      {/* Section divider */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32, marginBottom: 28 }}>
        <h2
          style={{
            margin: '0 0 6px',
            fontSize: 24,
            fontFamily: 'var(--serif)',
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {S.transparency_why_panel_title}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          {lang === 'fr'
            ? 'Chaque score est traçable jusqu\'aux moments concrets de l\'entretien.'
            : 'Every score is traceable to specific moments in the interview.'}
        </p>
      </div>

      {/* Unverified evidence global banner (if no skill sections but evidence exists) */}
      {unverified && skillAssessments.length === 0 && (
        <div
          role="alert"
          style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: '10px 14px', borderRadius: 10,
            background: '#FEF9C3', border: '1px solid #FDE047',
            color: '#78350F', fontSize: 13, marginBottom: 20, lineHeight: 1.5,
          }}
        >
          <AlertTriangleIcon size={15} />
          <span>{S.transparency_evidence_unverified_warning}</span>
        </div>
      )}

      {/* a) Per-skill evidence timeline */}
      {skillAssessments.length > 0 && (
        <section aria-labelledby="evidence-timeline-heading" style={{ marginBottom: 28 }}>
          <h2
            id="evidence-timeline-heading"
            style={{ fontSize: 18, fontFamily: 'var(--serif)', color: 'var(--ink)', margin: '0 0 16px' }}
          >
            {S.transparency_evidence_timeline}
          </h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {skillAssessments.map((sa, i) => (
              <SkillEvidenceCard
                key={i}
                sa={sa}
                evidence={evidence}
                lang={lang}
                unverified={unverified}
              />
            ))}
          </div>
        </section>
      )}

      {/* b) Counterfactuals */}
      <CounterfactualsSection counterfactuals={counterfactuals} lang={lang} />

      {/* c) HR controls */}
      <HRControlsSection
        token={interview}
        report={report}
        interviewToken={interviewToken}
        lang={lang}
        onReload={onReload}
      />
    </div>
  );
}
