import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  STRINGS, Logo, AriaOrb, LiveDot,
  MicIcon, CamIcon, PhoneIcon, CheckIcon, SparkleIcon, ArrowRight,
} from '../components/shared';
import { useCandidate } from '../context/CandidateContext';

export function PreInterview({ lang = 'fr', theme = 'light' }) {
  const navigate = useNavigate();
  const { interviewToken } = useParams();
  const { role, sharedStreamRef, candidate, session } = useCandidate();

  // If user lands here without a session (e.g. refresh), kick back to root
  React.useEffect(() => {
    if (!session || session.interview_token !== interviewToken) {
      navigate('/');
    }
  }, [session, interviewToken, navigate]);

  const sessionLang = role?.language || lang;
  const S = STRINGS[sessionLang];

  const videoRef = React.useRef(null);
  const audioCtxRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const rafRef = React.useRef(null);

  const [camReady, setCamReady] = React.useState(false);
  const [micReady, setMicReady] = React.useState(false);
  const [spkReady] = React.useState(true);
  const [netReady, setNetReady] = React.useState(navigator.onLine);
  const [consent, setConsent] = React.useState(true);
  const [micLevel, setMicLevel] = React.useState(0);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let stream;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        sharedStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamReady(stream.getVideoTracks().some((t) => t.enabled));
        setMicReady(stream.getAudioTracks().some((t) => t.enabled));

        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        src.connect(an);
        analyserRef.current = an;

        const data = new Uint8Array(an.frequencyBinCount);
        const tick = () => {
          an.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
          setMicLevel(avg);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        console.error('media error:', err);
        if (!cancelled) setError(err.message || 'Permission denied');
      }
    })();

    const onOnline = () => setNetReady(true);
    const onOffline = () => setNetReady(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, [sharedStreamRef]);

  const allReady = camReady && micReady && spkReady && netReady && consent;
  // Navigate to CV upload step (optional personalization) before the live interview.
  const start = () => { if (allReady) navigate(`/interviews/${interviewToken}/cv`); };

  if (!role) return null;

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, height: 820,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--sans)',
      }}>
        <div style={{
          padding: '18px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <Logo size={22} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {sessionLang === 'fr' ? 'Entretien sécurisé · chiffré de bout en bout' : 'Secure interview · end-to-end encrypted'}
          </span>
        </div>

        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1fr',
          gap: 40, padding: '48px 56px', alignItems: 'center',
        }}>
          <div>
            <span className="rt-pill" style={{ background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)' }}>
              <SparkleIcon size={12} fill="currentColor" /> {sessionLang === 'fr' ? 'Entretien avec IA' : 'AI interview'}
            </span>
            <h1 className="rt-serif" style={{ fontSize: 48, lineHeight: 1.05, margin: '16px 0 0', color: 'var(--ink)' }}>
              {sessionLang === 'fr' ? 'Bonjour' : 'Hello'} {candidate.name?.split(' ')[0] || ''} —<br />
              {sessionLang === 'fr' ? "prêt(e) à rencontrer Aria ?" : 'ready to meet Aria?'}
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', marginTop: 16, lineHeight: 1.5, maxWidth: 460 }}>
              {S.pre_sub}
            </p>

            <div className="rt-card" style={{ marginTop: 28, padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
              <Cell label={S.pre_role} value={role.title} />
              <Cell label={S.pre_company} value={role.company} />
              <Cell label={S.pre_duration} value={`${role.duration_minutes} ${S.pre_minutes}`} />
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 10 }}>{S.pre_tips_title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[S.pre_tip_1, S.pre_tip_2, S.pre_tip_3].map((t, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--muted)' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 999,
                      background: 'var(--sage-soft)', color: 'var(--sage)',
                      display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1,
                    }}>
                      <CheckIcon size={11} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div style={{
              position: 'relative', aspectRatio: '4/3',
              borderRadius: 24, overflow: 'hidden',
              background: '#1A1612', boxShadow: 'var(--shadow-lg)',
            }}>
              <video ref={videoRef} autoPlay muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              {!camReady && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                  background: 'rgba(26,22,18,0.85)', color: '#F5EEE3',
                  fontFamily: 'var(--serif)', fontSize: 20, padding: 24, textAlign: 'center',
                }}>
                  {error
                    ? (sessionLang === 'fr' ? "Caméra indisponible — autorisez l'accès" : 'Camera unavailable — grant access')
                    : (sessionLang === 'fr' ? 'Activation de la caméra...' : 'Activating camera...')}
                </div>
              )}

              <div style={{
                position: 'absolute', top: 14, right: 14,
                background: 'rgba(255,253,250,0.92)', backdropFilter: 'blur(12px)',
                borderRadius: 16, padding: '10px 14px 10px 10px',
                display: 'flex', alignItems: 'center', gap: 10,
                border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              }}>
                <AriaOrb size={34} state="idle" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Aria</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {sessionLang === 'fr' ? 'En attente...' : 'Waiting...'}
                  </div>
                </div>
              </div>

              <div style={{
                position: 'absolute', bottom: 14, left: 14, right: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
                  color: '#FFF', fontSize: 12, padding: '6px 12px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <LiveDot /> {camReady ? (sessionLang === 'fr' ? 'Caméra active' : 'Camera on') : (sessionLang === 'fr' ? 'Caméra coupée' : 'Camera off')}
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
                  padding: '6px 10px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <MicIcon size={12} />
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const active = micLevel > (i + 1) / 5 - 0.1;
                      return (
                        <div key={i} style={{
                          width: 2.5, height: 4 + i * 2,
                          background: active ? '#E8734A' : 'rgba(255,255,255,0.3)',
                          borderRadius: 1, transition: 'background 120ms',
                        }} />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <CheckRow icon={<CamIcon />} label={S.pre_camera} ok={camReady} />
              <CheckRow icon={<MicIcon />} label={S.pre_mic} ok={micReady} />
              <CheckRow icon={<PhoneIcon />} label={S.pre_speaker} ok={spkReady} />
              <CheckRow
                icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M5 12a14 14 0 0 1 14 0M2 8a20 20 0 0 1 20 0M8 16a8 8 0 0 1 8 0M12 20h.01" /></svg>}
                label={S.pre_connection} ok={netReady}
              />
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ accentColor: 'var(--terracotta)' }} />
                {S.pre_consent}
              </label>
            </div>
            <button
              className="rt-btn rt-btn-accent"
              disabled={!allReady}
              onClick={start}
              style={{
                marginTop: 16, width: '100%', padding: '16px 22px', fontSize: 15, borderRadius: 18,
                opacity: allReady ? 1 : 0.5, cursor: allReady ? 'pointer' : 'not-allowed',
              }}
            >
              {S.pre_start} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function CheckRow({ icon, label, ok }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 14,
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: 10,
        background: ok ? 'var(--sage-soft)' : 'var(--terracotta-soft)',
        color: ok ? 'var(--sage)' : 'var(--terracotta-deep)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11, color: ok ? 'var(--sage)' : 'var(--terracotta-deep)' }}>{ok ? 'OK' : '...'}</div>
      </div>
    </div>
  );
}
