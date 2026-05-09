import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  STRINGS, ChevronRight, PlusIcon, CheckIcon,
  GitCompareIcon, LayersIcon, XIcon,
} from '../components/shared';
import { SideNav } from './HRDashboard';
import { api } from '../lib/api';

export function RubricList({ lang = 'fr', theme = 'light' }) {
  const S = STRINGS[lang];
  const { roleId } = useParams();
  const navigate = useNavigate();

  const [rubrics, setRubrics] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Compare mode state
  const [compareMode, setCompareMode] = React.useState(false);
  const [compareSelected, setCompareSelected] = React.useState([]);
  const [showDiff, setShowDiff] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    setError(null);
    api.listRubrics(roleId)
      .then((data) => setRubrics(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roleId]);

  React.useEffect(() => { load(); }, [load]);

  const toggleCompareSelect = (id) => {
    setCompareSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const diffRubricA = compareSelected[0] ? rubrics.find((r) => r.id === compareSelected[0]) : null;
  const diffRubricB = compareSelected[1] ? rubrics.find((r) => r.id === compareSelected[1]) : null;

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, minHeight: 820,
        background: 'var(--bg)',
        display: 'grid', gridTemplateColumns: '224px 1fr',
        fontFamily: 'var(--sans)',
      }}>
        <SideNav lang={lang} active="rubrics" roleId={roleId} />

        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Link to="/hr" style={{ color: 'var(--muted)', textDecoration: 'none' }}>{S.hr_interviews}</Link>
                <ChevronRight size={12} />
                <span style={{ color: 'var(--ink)' }}>{S.rubric_nav}</span>
                {roleId && (
                  <>
                    <ChevronRight size={12} />
                    <span style={{ color: 'var(--muted)' }}>{lang === 'fr' ? `Poste #${roleId}` : `Role #${roleId}`}</span>
                  </>
                )}
              </div>
              <h1 className="rt-serif" style={{ fontSize: 34, margin: 0, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                {S.rubric_list_title}
              </h1>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{S.rubric_list_sub}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {rubrics.length >= 2 && (
                <button
                  className="rt-btn rt-btn-ghost"
                  onClick={() => { setCompareMode((m) => !m); setCompareSelected([]); setShowDiff(false); }}
                  aria-label={compareMode ? S.rubric_compare_cancel : S.rubric_compare}
                  style={{ fontSize: 13 }}
                >
                  <GitCompareIcon size={14} />
                  {compareMode ? S.rubric_compare_cancel : S.rubric_compare}
                </button>
              )}
              <Link
                to={`/hr/roles/${roleId}/rubrics/new`}
                className="rt-btn rt-btn-accent"
                style={{ textDecoration: 'none' }}
                aria-label={S.rubric_new}
              >
                <PlusIcon size={14} /> {S.rubric_new}
              </Link>
            </div>
          </div>

          {/* Compare action bar */}
          {compareMode && (
            <div style={{ padding: '12px 32px', background: 'var(--sage-soft)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <LayersIcon size={16} />
              <span style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 500 }}>
                {S.rubric_compare_select} ({compareSelected.length}/2)
              </span>
              {compareSelected.length === 2 && (
                <button
                  className="rt-btn rt-btn-primary"
                  style={{ fontSize: 12, padding: '8px 16px' }}
                  onClick={() => setShowDiff(true)}
                  aria-label={S.rubric_compare_view}
                >
                  {S.rubric_compare_view}
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '16px 32px', background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1 }}>{error}</span>
              <button className="rt-btn rt-btn-ghost" style={{ fontSize: 12 }} onClick={load}>
                {lang === 'fr' ? 'Réessayer' : 'Retry'}
              </button>
            </div>
          )}

          <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }} className="rt-scroll">
            {loading && (
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                {lang === 'fr' ? 'Chargement...' : 'Loading...'}
              </div>
            )}

            {!loading && rubrics.length === 0 && (
              <EmptyState lang={lang} S={S} roleId={roleId} />
            )}

            {!loading && rubrics.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                {/* Vertical timeline line */}
                <div style={{
                  position: 'absolute', left: 19, top: 24, bottom: 24,
                  width: 2, background: 'var(--border)',
                }} />

                {rubrics.map((r, idx) => (
                  <RubricRow
                    key={r.id}
                    rubric={r}
                    lang={lang}
                    S={S}
                    roleId={roleId}
                    navigate={navigate}
                    compareMode={compareMode}
                    isSelected={compareSelected.includes(r.id)}
                    onToggleSelect={() => toggleCompareSelect(r.id)}
                    isFirst={idx === 0}
                    isLast={idx === rubrics.length - 1}
                  />
                ))}
              </div>
            )}

            {/* Diff view */}
            {showDiff && diffRubricA && diffRubricB && (
              <DiffView
                rubricA={diffRubricA}
                rubricB={diffRubricB}
                lang={lang}
                S={S}
                onClose={() => setShowDiff(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ lang, S, roleId }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 32px', textAlign: 'center', gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--sage-soft)', display: 'grid', placeItems: 'center',
      }}>
        <LayersIcon size={28} />
      </div>
      <h2 className="rt-serif" style={{ fontSize: 26, margin: 0, color: 'var(--ink)' }}>{S.rubric_empty_title}</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 480, margin: 0, lineHeight: 1.6 }}>{S.rubric_empty_sub}</p>
      <Link
        to={`/hr/roles/${roleId}/rubrics/new`}
        className="rt-btn rt-btn-accent"
        style={{ textDecoration: 'none', marginTop: 8 }}
        aria-label={S.rubric_create_first}
      >
        <PlusIcon size={14} /> {S.rubric_create_first}
      </Link>
    </div>
  );
}

function RubricRow({ rubric, lang, S, roleId, navigate, compareMode, isSelected, onToggleSelect }) {
  const r = rubric;
  const testResults = r.test_results_json || null;
  const diffOk = testResults?.differentiation_ok;
  const lastTested = r.last_tested_at ? new Date(r.last_tested_at).toLocaleDateString() : null;
  const createdAt = r.created_at ? new Date(r.created_at).toLocaleDateString() : '—';

  const handleRowClick = () => {
    if (compareMode) { onToggleSelect(); return; }
    navigate(`/hr/roles/${roleId}/rubrics/${r.id}`);
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 20, padding: '20px 0',
        cursor: compareMode ? 'pointer' : 'default',
        position: 'relative',
      }}
      onClick={compareMode ? handleRowClick : undefined}
      role={compareMode ? 'button' : undefined}
      tabIndex={compareMode ? 0 : undefined}
      onKeyDown={compareMode ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelect(); } } : undefined}
      aria-pressed={compareMode ? isSelected : undefined}
    >
      {/* Timeline dot */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: r.is_active ? 'var(--sage)' : 'var(--surface)',
        border: `2px solid ${r.is_active ? 'var(--sage)' : isSelected ? 'var(--terracotta)' : 'var(--border)'}`,
        display: 'grid', placeItems: 'center', zIndex: 1,
        boxShadow: isSelected ? '0 0 0 3px var(--terracotta-soft)' : undefined,
      }}>
        {compareMode && isSelected
          ? <CheckIcon size={16} />
          : <span style={{ fontSize: 12, fontWeight: 600, color: r.is_active ? '#fff' : 'var(--ink)' }}>v{r.version}</span>
        }
      </div>

      {/* Card */}
      <div className="rt-card" style={{ flex: 1, padding: '18px 22px', transition: 'box-shadow 0.15s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="rt-serif" style={{ fontSize: 18, color: 'var(--ink)' }}>{r.name}</span>
            <span className="rt-pill" style={{
              background: r.is_active ? 'var(--sage-soft)' : 'var(--bg-deep)',
              color: r.is_active ? 'var(--sage)' : 'var(--muted)',
            }}>
              {r.is_active ? <CheckIcon size={11} /> : null} {r.is_active ? S.rubric_active : S.rubric_inactive}
            </span>
            {lastTested ? (
              <span className="rt-pill" style={{
                background: diffOk ? 'var(--sage-soft)' : 'var(--terracotta-soft)',
                color: diffOk ? 'var(--sage)' : 'var(--terracotta-deep)',
              }}>
                {diffOk ? S.rubric_diff_ok : S.rubric_diff_fail}
              </span>
            ) : (
              <span className="rt-pill" style={{ background: 'var(--bg-deep)', color: 'var(--muted)' }}>
                {S.rubric_not_tested}
              </span>
            )}
          </div>
          {!compareMode && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Link
                to={`/hr/roles/${roleId}/rubrics/${r.id}?clone=true`}
                className="rt-btn rt-btn-ghost"
                style={{ fontSize: 12, padding: '7px 14px', textDecoration: 'none' }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${S.rubric_clone} — ${r.name}`}
              >
                {S.rubric_clone}
              </Link>
              <button
                className="rt-btn rt-btn-ghost"
                style={{ fontSize: 12, padding: '7px 14px' }}
                onClick={() => navigate(`/hr/roles/${roleId}/rubrics/${r.id}`)}
                aria-label={lang === 'fr' ? `Voir la rubrique ${r.name}` : `View rubric ${r.name}`}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 20, fontSize: 12, color: 'var(--muted)' }}>
          <span>{S.rubric_version} {r.version}</span>
          {r.created_by && <span>{S.rubric_created_by}: {r.created_by}</span>}
          <span>{lang === 'fr' ? 'Créé le' : 'Created'} {createdAt}</span>
          {lastTested && <span>{lang === 'fr' ? 'Testé le' : 'Tested'} {lastTested}</span>}
        </div>

        {r.rubric_json?.skills && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {r.rubric_json.skills.map((sk) => (
              <span key={sk.id} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 999,
                background: 'var(--bg-deep)', color: 'var(--ink-2)',
              }}>
                {sk.name || sk.label} {sk.weight != null ? `${Math.round((sk.weight || 0) * 100)}%` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pure JS diff between two rubric_json objects ──

function diffValue(a, b) {
  if (JSON.stringify(a) === JSON.stringify(b)) return 'same';
  if (a === undefined) return 'added';
  if (b === undefined) return 'removed';
  return 'changed';
}

function DiffView({ rubricA, rubricB, lang, S, onClose }) {
  const jA = rubricA.rubric_json || {};
  const jB = rubricB.rubric_json || {};

  // Skills diff
  const allSkillIds = Array.from(new Set([
    ...(jA.skills || []).map((s) => s.id),
    ...(jB.skills || []).map((s) => s.id),
  ]));
  const skillDiffs = allSkillIds.map((id) => {
    const sA = (jA.skills || []).find((s) => s.id === id);
    const sB = (jB.skills || []).find((s) => s.id === id);
    const status = !sA ? 'added' : !sB ? 'removed' : diffValue(sA, sB);
    const weightDelta = sA && sB ? ((sB.weight || 0) - (sA.weight || 0)) * 100 : null;
    return { id, sA, sB, status, weightDelta };
  });

  // Stages diff
  const allStageIds = Array.from(new Set([
    ...(jA.stages || []).map((s) => s.id),
    ...(jB.stages || []).map((s) => s.id),
  ]));
  const stageDiffs = allStageIds.map((id) => {
    const sA = (jA.stages || []).find((s) => s.id === id);
    const sB = (jB.stages || []).find((s) => s.id === id);
    const status = !sA ? 'added' : !sB ? 'removed' : diffValue(sA, sB);
    return { id, sA, sB, status };
  });

  // Top-level diffs
  const langChanged = jA.language !== jB.language;
  const toneChanged = jA.tone !== jB.tone;
  const durationChanged = jA.duration_minutes !== jB.duration_minutes;

  const statusColor = {
    added: 'var(--sage)',
    removed: 'var(--terracotta-deep)',
    changed: 'var(--warning)',
    same: 'var(--muted)',
  };
  const statusBg = {
    added: 'var(--sage-soft)',
    removed: 'var(--terracotta-soft)',
    changed: '#FBE6BE',
    same: 'var(--bg-deep)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(31,27,22,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 32,
    }}
      role="dialog" aria-modal="true"
      aria-label={lang === 'fr' ? 'Comparaison des rubriques' : 'Rubric comparison'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rt-card" style={{
        width: '100%', maxWidth: 900, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--bg)',
      }}>
        {/* Diff header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="rt-serif" style={{ margin: 0, fontSize: 22 }}>
              {lang === 'fr' ? 'Comparaison' : 'Comparison'}: v{rubricA.version} vs v{rubricB.version}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 14 }}>
              <span style={{ color: statusColor.added }}>{lang === 'fr' ? 'Ajouté' : 'Added'}</span>
              <span style={{ color: statusColor.removed }}>{lang === 'fr' ? 'Supprimé' : 'Removed'}</span>
              <span style={{ color: statusColor.changed }}>{lang === 'fr' ? 'Modifié' : 'Changed'}</span>
            </div>
          </div>
          <button
            className="rt-btn rt-btn-ghost"
            style={{ padding: '8px 12px' }}
            onClick={onClose}
            aria-label={lang === 'fr' ? 'Fermer la comparaison' : 'Close comparison'}
          >
            <XIcon size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="rt-scroll">
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}></div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>v{rubricA.version} — {rubricA.name}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>v{rubricB.version} — {rubricB.name}</div>
          </div>

          {/* Top-level changes */}
          {(langChanged || toneChanged || durationChanged) && (
            <DiffSection title={lang === 'fr' ? 'Paramètres généraux' : 'General settings'}>
              {langChanged && (
                <DiffRow label="Language" valA={jA.language} valB={jB.language} status="changed" statusColor={statusColor} statusBg={statusBg} />
              )}
              {toneChanged && (
                <DiffRow label="Tone" valA={jA.tone} valB={jB.tone} status="changed" statusColor={statusColor} statusBg={statusBg} />
              )}
              {durationChanged && (
                <DiffRow label={lang === 'fr' ? 'Durée (min)' : 'Duration (min)'} valA={jA.duration_minutes} valB={jB.duration_minutes} status="changed" statusColor={statusColor} statusBg={statusBg} />
              )}
            </DiffSection>
          )}

          {/* Skills */}
          <DiffSection title={lang === 'fr' ? 'Compétences' : 'Skills'}>
            {skillDiffs.map(({ id, sA, sB, status, weightDelta }) => (
              <div key={id} style={{
                display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 16,
                padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                background: status !== 'same' ? statusBg[status] : 'transparent',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: statusColor[status], display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[status], flexShrink: 0 }} />
                  {id}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {sA ? `${sA.name || sA.label} (${Math.round((sA.weight || 0) * 100)}%)` : <em style={{ color: 'var(--muted)' }}>—</em>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {sB ? (
                    <span>
                      {sB.name || sB.label} ({Math.round((sB.weight || 0) * 100)}%)
                      {weightDelta != null && Math.abs(weightDelta) > 0.05 && (
                        <span style={{ marginLeft: 6, color: weightDelta > 0 ? statusColor.added : statusColor.removed, fontSize: 11 }}>
                          {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)}%
                        </span>
                      )}
                    </span>
                  ) : <em style={{ color: 'var(--muted)' }}>—</em>}
                </div>
              </div>
            ))}
          </DiffSection>

          {/* Stages */}
          <DiffSection title={lang === 'fr' ? 'Étapes' : 'Stages'}>
            {stageDiffs.map(({ id, sA, sB, status }) => (
              <div key={id} style={{
                display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 16,
                padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                background: status !== 'same' ? statusBg[status] : 'transparent',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: statusColor[status], display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[status], flexShrink: 0 }} />
                  {id}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {sA ? `${sA.name || sA.label} (${sA.duration_minutes}min)` : <em style={{ color: 'var(--muted)' }}>—</em>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {sB ? `${sB.name || sB.label} (${sB.duration_minutes}min)` : <em style={{ color: 'var(--muted)' }}>—</em>}
                </div>
              </div>
            ))}
          </DiffSection>

          {/* Exclusions */}
          <DiffSection title={lang === 'fr' ? 'Exclusions' : 'Exclusions'}>
            {(() => {
              const askA = (jA.exclusions?.do_not_ask_about || []).join(', ') || '—';
              const askB = (jB.exclusions?.do_not_ask_about || []).join(', ') || '—';
              const scoreA = (jA.exclusions?.do_not_score_on || []).join(', ') || '—';
              const scoreB = (jB.exclusions?.do_not_score_on || []).join(', ') || '—';
              return (
                <>
                  <DiffRow label="do_not_ask_about" valA={askA} valB={askB} status={askA !== askB ? 'changed' : 'same'} statusColor={statusColor} statusBg={statusBg} />
                  <DiffRow label="do_not_score_on" valA={scoreA} valB={scoreB} status={scoreA !== scoreB ? 'changed' : 'same'} statusColor={statusColor} statusBg={statusBg} />
                </>
              );
            })()}
          </DiffSection>
        </div>
      </div>
    </div>
  );
}

function DiffSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function DiffRow({ label, valA, valB, status, statusColor, statusBg }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 16,
      padding: '10px 12px', borderRadius: 10, marginBottom: 6,
      background: status !== 'same' ? statusBg[status] : 'transparent',
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: statusColor[status] }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{String(valA ?? '—')}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{String(valB ?? '—')}</div>
    </div>
  );
}
