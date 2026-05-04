import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Logo, AriaOrb, ArrowRight, SparkleIcon } from '../components/shared';
import { api } from '../lib/api';
import { useCandidate } from '../context/CandidateContext';

export function ScreeningEntry({ lang = 'fr', theme = 'light' }) {
  const { roleToken } = useParams();
  const navigate = useNavigate();
  const { setRole, setSession, setCandidate } = useCandidate();

  const [role, setRoleLocal] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    api.getScreening(roleToken)
      .then((r) => { if (!cancelled) { setRoleLocal(r); setRole(r); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roleToken, setRole]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session = await api.startScreening(roleToken, {
        candidate_name: name,
        candidate_email: email,
      });
      setCandidate({ name, email });
      setSession(session);
      navigate(`/interviews/${session.interview_token}/setup`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const en = (role?.language || lang) === 'en';

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, minHeight: 820,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--sans)',
      }}>
        <div style={{ padding: '18px 32px', borderBottom: '1px solid var(--border)' }}>
          <Logo size={22} />
        </div>

        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40,
          padding: '60px 56px', alignItems: 'center',
        }}>
          <div>
            {loading && <p style={{ color: 'var(--muted)' }}>{en ? 'Loading...' : 'Chargement...'}</p>}
            {error && !role && (
              <div className="rt-card" style={{ padding: 22, background: 'var(--terracotta-soft)', borderColor: 'var(--terracotta)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--terracotta-deep)', marginBottom: 6 }}>
                  {en ? 'Link unavailable' : 'Lien indisponible'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{error}</div>
              </div>
            )}
            {role && (
              <>
                <span className="rt-pill" style={{ background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)' }}>
                  <SparkleIcon size={12} fill="currentColor" /> {en ? 'Voice interview with Aria' : 'Entretien vocal avec Aria'}
                </span>
                <h1 className="rt-serif" style={{ fontSize: 56, lineHeight: 1.02, margin: '16px 0 0', color: 'var(--ink)' }}>
                  {role.title}
                </h1>
                <div style={{ marginTop: 8, fontSize: 15, color: 'var(--muted)' }}>
                  {role.company} · {role.duration_minutes} {en ? 'min' : 'min'} · {role.seniority}
                </div>
                {role.skills?.length > 0 && (
                  <div style={{ marginTop: 18, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {role.skills.map((s) => (
                      <span key={s} className="rt-pill" style={{ background: 'var(--bg-deep)', color: 'var(--ink-2)' }}>{s}</span>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 16, color: 'var(--muted)', marginTop: 28, lineHeight: 1.6, maxWidth: 460 }}>
                  {en
                    ? "Aria will run a structured voice interview tailored to this role. There's no right or wrong — just a conversation. You can take it whenever you're ready."
                    : "Aria va mener un entretien vocal structuré pour ce poste. Pas de bonne ou de mauvaise réponse — juste une conversation. Vous pouvez le passer quand vous êtes prêt(e)."}
                </p>
              </>
            )}
          </div>

          {role && (
            <form onSubmit={submit} className="rt-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <AriaOrb size={48} state="idle" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Aria</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{en ? 'will guide you through' : 'vous accompagne'}</div>
                </div>
              </div>

              <Field label={en ? 'Your full name' : 'Votre nom complet'}>
                <input required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              </Field>
              <Field label={en ? 'Your email' : 'Votre e-mail'}>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              </Field>

              {error && (
                <div style={{ fontSize: 12, color: 'var(--terracotta-deep)' }}>{error}</div>
              )}

              <button type="submit" disabled={submitting} className="rt-btn rt-btn-accent"
                style={{ marginTop: 8, padding: '14px 22px', fontSize: 15, borderRadius: 16, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? (en ? 'Preparing...' : 'Préparation...') : (en ? 'Continue' : 'Continuer')}
                <ArrowRight size={15} />
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                {en
                  ? 'By continuing you consent to your interview being recorded for evaluation purposes.'
                  : "En continuant, vous acceptez l'enregistrement de l'entretien à des fins d'évaluation."}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  border: '1px solid var(--border)', background: 'var(--surface)',
  fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none',
};
