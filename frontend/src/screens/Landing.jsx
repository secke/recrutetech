import { Link } from 'react-router-dom';
import { Logo, AriaOrb, ArrowRight, SparkleIcon } from '../components/shared';

export function Landing({ lang = 'fr', theme = 'light' }) {
  const en = lang === 'en';
  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, minHeight: 820,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--sans)',
      }}>
        <div style={{
          padding: '20px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <Logo size={24} />
          <Link to="/hr" style={{
            fontSize: 13, color: 'var(--ink)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {en ? 'Recruiter login' : 'Espace recruteur'} <ArrowRight size={13} />
          </Link>
        </div>

        <div style={{
          flex: 1, padding: '80px 80px',
          display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, alignItems: 'center',
        }}>
          <div>
            <span className="rt-pill" style={{ background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)', marginBottom: 24 }}>
              <SparkleIcon size={12} fill="currentColor" /> {en ? 'Voice-first AI hiring' : 'Recrutement IA, en voix'}
            </span>
            <h1 className="rt-serif" style={{
              fontSize: 80, lineHeight: 1, margin: '20px 0 0',
              color: 'var(--ink)', letterSpacing: '-0.02em',
            }}>
              {en ? 'Hire by listening,' : 'Recrutez en écoutant,'}<br />
              {en ? <em>not by reading.</em> : <em>pas en lisant.</em>}
            </h1>
            <p style={{ fontSize: 19, color: 'var(--muted)', marginTop: 24, lineHeight: 1.5, maxWidth: 520 }}>
              {en
                ? "Aria conducts structured voice interviews on your behalf — async, multilingual, and grounded in the role you actually need to fill."
                : "Aria conduit des entretiens vocaux structurés à votre place — asynchrones, multilingues, et alignés sur le poste à pourvoir."}
            </p>

            <div style={{ marginTop: 36, display: 'flex', gap: 12 }}>
              <Link to="/hr/templates/new" className="rt-btn rt-btn-accent" style={{ textDecoration: 'none', fontSize: 15, padding: '14px 22px' }}>
                {en ? 'Create your first screening' : 'Créer votre premier entretien'} <ArrowRight size={15} />
              </Link>
              <Link to="/hr" className="rt-btn rt-btn-ghost" style={{ textDecoration: 'none', fontSize: 15, padding: '14px 22px' }}>
                {en ? 'See dashboard' : 'Voir le tableau de bord'}
              </Link>
            </div>

            <div style={{ marginTop: 56, display: 'flex', gap: 32, color: 'var(--muted)', fontSize: 13 }}>
              <Stat n="∞" label={en ? 'screenings / day' : 'entretiens / jour'} />
              <Stat n="< 60s" label={en ? 'setup per role' : 'à configurer'} />
              <Stat n="2" label={en ? 'languages live' : 'langues actives'} />
            </div>
          </div>

          <div style={{ display: 'grid', placeItems: 'center', position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: -40, borderRadius: 999,
              background: 'radial-gradient(circle, var(--terracotta-soft), transparent 65%)',
              filter: 'blur(20px)',
            }} />
            <AriaOrb size={360} state="speaking" />
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 16px', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 999,
              fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: 'var(--shadow-md)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--terracotta)' }} />
              Aria · {en ? 'live and ready' : 'prête à écouter'}
            </div>
          </div>
        </div>

        <div style={{
          padding: '24px 40px', borderTop: '1px solid var(--border)',
          fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>© RecruteTech</span>
          <span>{en ? 'Powered by ElevenLabs Conversational AI' : 'Propulsé par ElevenLabs Conversational AI'}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div>
      <div className="rt-serif" style={{ fontSize: 26, color: 'var(--ink)', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}
