import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import {
  STRINGS, Logo, AriaOrb,
  MicIcon, MicOffIcon, CamIcon, CamOffIcon, ClockIcon, MoreIcon, PhoneIcon, CheckIcon,
} from '../components/shared';
import { useCandidate } from '../context/CandidateContext';
import { useVideoAnalysis } from '../hooks/useVideoAnalysis';
import { api } from '../lib/api';

// Module-level guard: survives React StrictMode's double-mount in dev so we
// don't burn the one-shot ElevenLabs signed URL by starting twice.
const startedTokens = new Set();

export function LiveInterview(props) {
  // useConversation requires a ConversationProvider ancestor — wrapping at the
  // screen boundary keeps the rest of the app free of ElevenLabs context.
  return (
    <ConversationProvider>
      <LiveInterviewInner {...props} />
    </ConversationProvider>
  );
}

function LiveInterviewInner({ lang = 'fr', theme = 'light' }) {
  const navigate = useNavigate();
  const { interviewToken } = useParams();
  const { role, session, sharedStreamRef } = useCandidate();

  const sessionLang = role?.language || lang;
  const S = STRINGS[sessionLang];

  const videoRef = React.useRef(null);
  const conversationIdRef = React.useRef(null);
  const startedAtRef = React.useRef(null);

  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [transcript, setTranscript] = React.useState([]);
  const [currentAria, setCurrentAria] = React.useState('');
  const [aggregateMetrics, setAggregateMetrics] = React.useState(null);
  const [error, setError] = React.useState(null);

  const conversation = useConversation({
    onConnect: ({ conversationId } = {}) => {
      console.log('🔌 Connected to Aria', conversationId || '');
      if (startedAtRef.current == null) startedAtRef.current = Date.now();
      // Prefer the id from the connect payload; fall back to getId() if absent.
      let id = conversationId;
      if (!id) {
        try { id = conversation.getId?.(); }
        catch (e) { console.warn('getId failed:', e?.message || e); }
      }
      if (id && conversationIdRef.current !== id) {
        conversationIdRef.current = id;
        api.linkConversation(interviewToken, id).catch(console.error);
      }
    },
    onDisconnect: () => console.log('🔌 Disconnected'),
    onError: (e) => { console.error('elevenlabs error', e); setError(String(e?.message || e)); },
    onMessage: (m) => {
      // m: { message: string, source: 'ai' | 'user' }
      if (!m?.message) return;
      const t = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : null;
      if (m.source === 'ai') setCurrentAria(m.message);
      setTranscript((prev) => [...prev, {
        who: m.source === 'ai' ? 'aria' : 'you',
        text: m.message,
        t,
      }]);
    },
  });

  // Connect once we have a session payload from the backend.
  // Guarded by a module-level Set so StrictMode's dev double-mount can't
  // call startSession twice on the same one-shot signed URL.
  React.useEffect(() => {
    if (!session || session.interview_token !== interviewToken) return;
    if (startedTokens.has(interviewToken)) return;
    startedTokens.add(interviewToken);

    let stream = sharedStreamRef.current;

    const begin = async () => {
      try {
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          sharedStreamRef.current = stream;
        }
        if (videoRef.current) videoRef.current.srcObject = stream;

        console.log('🎙️ Aria: starting session with overrides', session.overrides);
        // startSession returns void in @elevenlabs/react v1.x; the conversation_id
        // is fetched once connected, in the onConnect callback above.
        conversation.startSession({
          signedUrl: session.signed_url,
          overrides: session.overrides,
        });
      } catch (err) {
        console.error('startSession failed:', err);
        startedTokens.delete(interviewToken); // allow a manual retry
        setError(err?.message || String(err) || 'Failed to start');
      }
    };
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewToken]);

  // If we landed here without a session (e.g. page refresh), bounce to root
  // — but only after first render, so the user sees something rather than blank.
  React.useEffect(() => {
    if (!session || session.interview_token !== interviewToken) {
      const t = setTimeout(() => navigate('/'), 1500);
      return () => clearTimeout(t);
    }
  }, [session, interviewToken, navigate]);

  // Mute / camera toggles act on the local stream
  React.useEffect(() => {
    const s = sharedStreamRef.current;
    if (s) s.getVideoTracks().forEach((t) => (t.enabled = !camOff));
  }, [camOff, sharedStreamRef]);
  React.useEffect(() => {
    const s = sharedStreamRef.current;
    if (s) s.getAudioTracks().forEach((t) => (t.enabled = !muted));
    // ElevenLabs SDK has its own mic capture — only sync once the WS is up,
    // otherwise setMuted throws "No active conversation".
    if (conversation.status === 'connected') {
      try { conversation.setMuted?.(muted); }
      catch (e) { console.warn('setMuted skipped:', e?.message || e); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, conversation.status]);

  // Elapsed timer
  React.useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // MediaPipe visual analysis — accumulate latest reading
  const handleMetricsUpdate = React.useCallback((m) => setAggregateMetrics(m), []);
  useVideoAnalysis({
    videoElement: videoRef.current,
    onMetricsUpdate: handleMetricsUpdate,
    analysisInterval: 2000,
    enabled: !camOff && conversation.status === 'connected',
  });

  const endCall = async () => {
    try {
      if (conversation.status === 'connected' || conversation.status === 'connecting') {
        await conversation.endSession();
      }
    } catch { /* ignore */ }
    startedTokens.delete(interviewToken);

    // Submit captured transcript so the backend can run report generation
    // without waiting on the ElevenLabs post-call webhook (which needs a
    // public backend URL to land). Backend ignores duplicate submits.
    if (transcript.length > 0) {
      const turns = transcript.map((t) => ({
        role: t.who === 'aria' ? 'agent' : 'user',
        text: t.text,
        time_in_call_secs: typeof t.t === 'number' ? t.t : null,
      }));
      api.submitTranscript(interviewToken, turns).catch(console.error);
    }

    if (aggregateMetrics) {
      api.submitVisualMetrics(interviewToken, {
        eyeContactRatio: aggregateMetrics.eyeContactRatio ?? null,
        smileRatio: aggregateMetrics.smileRatio ?? null,
        attentionRatio: aggregateMetrics.attentionRatio ?? null,
        blinkRate: aggregateMetrics.blinkRate ?? null,
        headStability: aggregateMetrics.headStability ?? null,
      }).catch(console.error);
    }
    api.endScreening(interviewToken).catch(console.error);

    // Stop local tracks
    const s = sharedStreamRef.current;
    if (s) { s.getTracks().forEach((t) => t.stop()); sharedStreamRef.current = null; }

    navigate(`/interviews/${interviewToken}/done`);
  };

  // Map ElevenLabs status to Aria's visual state
  const isSpeaking = conversation.isSpeaking;
  const isConnected = conversation.status === 'connected';
  const ariaVisual = !isConnected ? 'idle' : isSpeaking ? 'speaking' : 'listening';
  const statusText =
    conversation.status === 'connecting' ? (sessionLang === 'fr' ? 'Connexion...' : 'Connecting...')
    : !isConnected ? (sessionLang === 'fr' ? 'Hors ligne' : 'Offline')
    : isSpeaking ? S.live_aria_speaking
    : S.live_aria_listening;

  const total = (role?.duration_minutes || 45) * 60;
  const remaining = Math.max(0, total - elapsed);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const currentStage = Math.min(4, Math.floor(elapsed / Math.max(1, total / 5)));

  if (!role || !session || session.interview_token !== interviewToken) {
    const en = sessionLang === 'en';
    return (
      <div className="rt-app-page">
        <div data-theme={theme} className="rt-root" style={{
          width: 1280, height: 820, background: 'var(--bg)',
          display: 'grid', placeItems: 'center', fontFamily: 'var(--sans)', color: 'var(--ink)',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
            <AriaOrb size={120} state="idle" />
            <h2 className="rt-serif" style={{ fontSize: 28, marginTop: 24 }}>
              {en ? 'Session expired' : 'Session expirée'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
              {en
                ? "We can't find your interview session. This usually happens after a refresh — please reopen the link your recruiter sent."
                : "Impossible de retrouver votre session d'entretien. Cela arrive souvent après un rafraîchissement — veuillez rouvrir le lien envoyé par votre recruteur."}
            </p>
            <button onClick={() => navigate('/')} className="rt-btn rt-btn-accent"
              style={{ marginTop: 20, padding: '10px 18px', fontSize: 13 }}>
              {en ? 'Back to home' : "Retour à l'accueil"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, height: 820,
        background: 'var(--bg-deep)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--sans)', color: 'var(--ink)',
      }}>
        <div style={{
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Logo size={20} />
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <StageTracker stages={S.live_stages} current={currentStage} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ClockIcon size={14} />
            <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: 'var(--muted)', marginRight: 6, fontSize: 11 }}>{S.live_remaining}</span>
              {fmt(remaining)}
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: 999,
              background: isConnected ? 'var(--terracotta)' : 'var(--muted)',
              boxShadow: isConnected ? '0 0 0 4px var(--terracotta-soft)' : 'none',
            }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: isConnected ? 'var(--terracotta-deep)' : 'var(--muted)' }}>
              {isConnected ? 'REC' : '...'}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>
          <div style={{
            position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(ellipse 80% 60% at 50% 35%, var(--terracotta-soft) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, var(--sage-soft) 0%, transparent 55%), var(--bg)`,
            padding: 40,
          }}>
            <div style={{ transform: 'translateY(-20px)' }}>
              <AriaOrb size={240} state={ariaVisual} />
            </div>

            <div style={{ marginTop: 36, textAlign: 'center', maxWidth: 640 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '5px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 999, fontSize: 12, color: 'var(--muted)', marginBottom: 16,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 999,
                  background: ariaVisual === 'listening' ? 'var(--sage)' : 'var(--terracotta)',
                  animation: 'aria-breathe 1.6s ease-in-out infinite',
                }} />
                {statusText}
              </div>
              {isSpeaking && currentAria && (
                <p className="rt-serif" style={{ fontSize: 26, lineHeight: 1.3, margin: 0, fontStyle: 'italic' }}>
                  "{currentAria}"
                </p>
              )}
              {!isSpeaking && isConnected && (
                <p className="rt-serif" style={{ fontSize: 22, color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>
                  {sessionLang === 'fr' ? 'Je vous écoute...' : "I'm listening..."}
                </p>
              )}
              {error && <p style={{ color: 'var(--terracotta-deep)', fontSize: 12, marginTop: 16 }}>{error}</p>}
            </div>

            <div style={{ position: 'absolute', bottom: 24, left: 24 }}>
              <div style={{
                position: 'relative', width: 180, height: 135,
                borderRadius: 18, overflow: 'hidden',
                background: '#1A1612', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}>
                <video ref={videoRef} autoPlay muted playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camOff ? 'none' : 'block' }} />
                {camOff && (
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#F5EEE3', fontFamily: 'var(--serif)', fontSize: 36 }}>
                    {sessionLang === 'fr' ? 'V' : 'Y'}
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 8, left: 8,
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
                  color: '#FFF', fontSize: 11, fontWeight: 500, padding: '4px 10px',
                  borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {muted ? <MicOffIcon size={11} /> : <span style={{ width: 6, height: 6, borderRadius: 999, background: '#E8734A' }} />}
                  {sessionLang === 'fr' ? 'Vous' : S.live_you}
                </div>
              </div>
            </div>

            <div style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 10, alignItems: 'center',
              padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 999, boxShadow: 'var(--shadow-md)',
            }}>
              <ControlBtn active={!muted} onClick={() => setMuted(!muted)} title={muted ? S.live_unmute : S.live_mute}>
                {muted ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
              </ControlBtn>
              <ControlBtn active={!camOff} onClick={() => setCamOff(!camOff)} title={S.live_camera_off}>
                {camOff ? <CamOffIcon size={18} /> : <CamIcon size={18} />}
              </ControlBtn>
              <ControlBtn><MoreIcon size={18} /></ControlBtn>
              <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
              <button onClick={endCall} className="rt-btn"
                style={{ background: '#B94A3B', color: '#FFF', border: 'none', padding: '8px 16px', fontSize: 13 }}>
                <PhoneIcon size={14} /> {S.live_end}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{S.live_transcript}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {transcript.length} {sessionLang === 'fr' ? 'messages' : 'messages'}
              </div>
            </div>
            <div className="rt-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {transcript.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 40 }}>
                  {sessionLang === 'fr' ? "L'entretien commence..." : 'Interview starting...'}
                </div>
              )}
              {transcript.map((m, i) => (<TranscriptMsg key={i} msg={m} lang={sessionLang} />))}
            </div>
            <div style={{ padding: '14px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {sessionLang === 'fr' ? 'Observation Aria' : 'Aria notes'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {aggregateMetrics?.eyeContactRatio != null && (
                  <Chip label={`${sessionLang === 'fr' ? 'Regard caméra' : 'Eye contact'}: ${(aggregateMetrics.eyeContactRatio * 100).toFixed(0)}%`} />
                )}
                {aggregateMetrics?.attentionRatio != null && (
                  <Chip label={`${sessionLang === 'fr' ? 'Attention' : 'Attention'}: ${(aggregateMetrics.attentionRatio * 100).toFixed(0)}%`} />
                )}
                {!aggregateMetrics && <Chip label={sessionLang === 'fr' ? 'Analyse en attente' : 'Awaiting analysis'} muted />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageTracker({ stages, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {stages.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 999,
                background: done ? 'var(--sage)' : active ? 'var(--terracotta)' : 'var(--bg-deep)',
                color: done || active ? '#FFF' : 'var(--muted)',
                display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600,
                border: '1px solid ' + (done ? 'var(--sage)' : active ? 'var(--terracotta)' : 'var(--border)'),
              }}>{done ? <CheckIcon size={10} /> : i + 1}</span>
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--ink)' : done ? 'var(--muted)' : 'var(--muted-2)' }}>{s}</span>
            </div>
            {i < stages.length - 1 && (
              <div style={{ width: 24, height: 2, borderRadius: 2, background: done ? 'var(--sage)' : 'var(--border)' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TranscriptMsg({ msg, lang }) {
  const isAria = msg.who === 'aria';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      {isAria ? (
        <div style={{ flexShrink: 0, marginTop: 2 }}><AriaOrb size={26} state="idle" /></div>
      ) : (
        <div style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--sage-soft)', color: 'var(--sage)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
          {lang === 'fr' ? 'V' : 'Y'}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 3 }}>
          {isAria ? 'Aria' : (lang === 'fr' ? 'Vous' : 'You')}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>{msg.text}</div>
      </div>
    </div>
  );
}

function Chip({ label, muted }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 9px',
      background: muted ? '#F5EBD2' : 'var(--sage-soft)',
      color: muted ? '#8F6B1E' : 'var(--sage)',
      borderRadius: 999, fontWeight: 500,
    }}>{label}</span>
  );
}

function ControlBtn({ children, active = true, onClick, title }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 42, height: 42, borderRadius: 999,
      background: active ? 'var(--bg)' : '#B94A3B',
      color: active ? 'var(--ink)' : '#FFF',
      border: '1px solid ' + (active ? 'var(--border)' : 'transparent'),
      cursor: 'pointer', display: 'grid', placeItems: 'center', fontFamily: 'inherit',
    }}>{children}</button>
  );
}
