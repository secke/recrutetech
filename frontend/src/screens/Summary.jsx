import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { STRINGS, Logo, AriaOrb, SparkleIcon, CheckIcon } from '../components/shared';
import { useCandidate } from '../context/CandidateContext';
import { api } from '../lib/api';

export function Summary({ lang = 'fr', theme = 'light' }) {
  const { interviewToken } = useParams();
  const { role } = useCandidate();
  const sessionLang = role?.language || lang;
  const S = STRINGS[sessionLang];

  const [interview, setInterview] = React.useState(null);
  const [polling, setPolling] = React.useState(true);

  // Poll once a few times — the Claude report or ElevenLabs analysis lands
  // asynchronously. Stop as soon as either arrives, or after MAX_ATTEMPTS.
  // Hard-cap with a one-shot timer so we can't loop indefinitely if a render
  // remounts this effect; the interval is cleared as soon as we have a result.
  React.useEffect(() => {
    const MAX_ATTEMPTS = 12;
    const INTERVAL_MS = 10_000;
    let mounted = true;
    let attempts = 0;
    let intervalId = null;
    const stop = () => {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      if (mounted) setPolling(false);
    };
    const tick = async () => {
      attempts += 1;
      try {
        const iv = await api.getInterview(interviewToken);
        if (!mounted) return;
        setInterview(iv);
        if (iv?.report || iv?.analysis || attempts >= MAX_ATTEMPTS) stop();
      } catch {
        if (attempts >= MAX_ATTEMPTS) stop();
      }
    };
    tick();
    intervalId = setInterval(tick, INTERVAL_MS);
    return () => { mounted = false; if (intervalId) clearInterval(intervalId); };
  }, [interviewToken]);

  const transcriptCount = interview?.transcript?.length ?? 0;
  const ariaTurns = (interview?.transcript || []).filter((t) => t.role === 'agent').length;
  const dur = interview?.started_at && interview?.ended_at
    ? Math.floor((new Date(interview.ended_at) - new Date(interview.started_at)) / 1000)
    : 0;
  const durLabel = dur > 0 ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '—';

  // Prefer the Claude-generated candidate letter; fall back to ElevenLabs analysis summary.
  const analysis = interview?.analysis || null;
  const report = interview?.report || null;
  const candidateLetter = report?.candidate_letter || null;
  const summaryText = analysis?.transcript_summary || analysis?.summary || null;

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, minHeight: 820,
        background: 'var(--bg)',
        fontFamily: 'var(--sans)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <Logo size={22} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {sessionLang === 'fr' ? 'Entretien terminé' : 'Interview ended'} · {role?.company || ''}
          </span>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1fr', overflow: 'hidden' }}>
          <div style={{
            padding: '64px 56px', display: 'flex', flexDirection: 'column',
            background: `radial-gradient(ellipse 80% 60% at 30% 30%, var(--terracotta-soft), transparent 60%), var(--bg)`,
          }}>
            <div style={{ marginBottom: 28 }}><AriaOrb size={100} state="idle" /></div>
            <h1 className="rt-serif" style={{ fontSize: 64, lineHeight: 1, margin: 0, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
              {S.sum_title}
            </h1>
            <p style={{ fontSize: 17, color: 'var(--muted)', marginTop: 18, lineHeight: 1.5, maxWidth: 480 }}>
              {S.sum_sub}
            </p>

            <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'auto auto auto', gap: 32, width: 'fit-content' }}>
              <SumStat label={S.sum_duration} value={durLabel} />
              <SumStat label={S.sum_questions} value={String(ariaTurns)} />
              <SumStat label={sessionLang === 'fr' ? 'Échanges' : 'Exchanges'} value={String(transcriptCount)} />
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: 12, paddingTop: 40 }}>
              <Link to="/" className="rt-btn rt-btn-primary" style={{ textDecoration: 'none' }}>
                {sessionLang === 'fr' ? "Retour à l'accueil" : 'Back to home'}
              </Link>
            </div>
          </div>

          <div style={{ padding: '64px 56px 48px 32px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto' }} className="rt-scroll">
            <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {sessionLang === 'fr' ? "Synthèse d'Aria" : "Aria's summary"}
            </div>

            {polling && !candidateLetter && !summaryText && (
              <div className="rt-card" style={{ padding: 18, color: 'var(--muted)', fontSize: 13 }}>
                {sessionLang === 'fr' ? "Aria analyse l'entretien..." : 'Aria is analyzing the interview...'}
              </div>
            )}

            {candidateLetter && (
              <div className="rt-card" style={{ padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                  {candidateLetter.subject}
                </div>
                <p className="rt-serif" style={{ fontSize: 17, lineHeight: 1.55, margin: 0, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
                  {candidateLetter.body}
                </p>
              </div>
            )}

            {!candidateLetter && summaryText && (
              <div className="rt-card" style={{ padding: 22 }}>
                <p className="rt-serif" style={{ fontSize: 19, lineHeight: 1.4, margin: 0, color: 'var(--ink)' }}>
                  {summaryText}
                </p>
              </div>
            )}

            <div style={{ marginTop: 28, padding: 22, borderRadius: 20, background: 'var(--terracotta-soft)', border: '1px solid rgba(232,115,74,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--terracotta-deep)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <SparkleIcon size={12} fill="currentColor" /> {S.sum_next}
              </div>
              <p className="rt-serif" style={{ fontSize: 22, lineHeight: 1.3, color: 'var(--ink)', margin: '10px 0 0' }}>
                {S.sum_feedback_in}
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                {sessionLang === 'fr'
                  ? "Vous recevrez un rapport personnalisé par e-mail avec des recommandations pour progresser."
                  : "You'll receive a personalized report by email with recommendations to grow."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SumStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ marginTop: 4 }}>
        <span className="rt-serif" style={{ fontSize: 38, color: 'var(--ink)', lineHeight: 1 }}>{value}</span>
      </div>
    </div>
  );
}
