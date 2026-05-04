import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';

const CandidateContext = createContext(null);

const STORAGE_KEY = 'recrutetech.candidate.v1';

function readPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writePersisted(data) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { /* sessionStorage might be disabled — non-fatal */ }
}

export function CandidateProvider({ children }) {
  const initial = readPersisted() || {};
  const [role, setRole] = useState(initial.role || null);
  const [session, setSession] = useState(initial.session || null); // { interview_token, agent_id, signed_url, overrides }
  const [candidate, setCandidate] = useState(initial.candidate || { name: '', email: '' });
  const sharedStreamRef = useRef(null);

  // Persist across navigation/reload within the same browser tab.
  // ElevenLabs signed URLs are short-lived, so a stale session simply fails to
  // start and the screen falls back to the "Session expired" UI.
  useEffect(() => {
    writePersisted({ role, session, candidate });
  }, [role, session, candidate]);

  const value = useMemo(() => ({
    role, setRole,
    session, setSession,
    candidate, setCandidate,
    sharedStreamRef,
  }), [role, session, candidate]);

  return <CandidateContext.Provider value={value}>{children}</CandidateContext.Provider>;
}

export function useCandidate() {
  const ctx = useContext(CandidateContext);
  if (!ctx) throw new Error('useCandidate must be used inside CandidateProvider');
  return ctx;
}
