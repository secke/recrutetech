import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { STRINGS, Logo, SparkleIcon, CheckIcon, ArrowRight, XIcon, ChevronDownIcon, ChevronUpIcon } from '../components/shared';
import { useCandidate } from '../context/CandidateContext';
import { api } from '../lib/api';

// ── timeout constant for CV analysis (ms) ──────────────────────────────────
const ANALYSIS_TIMEOUT_MS = 12_000;

// ── accepted MIME / extension helpers ──────────────────────────────────────
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_TEXT_CHARS = 50;

function getFileExtension(name = '') {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return '';
  return name.slice(dot).toLowerCase();
}

function isValidFile(file) {
  if (!file) return false;
  const ext = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(ext) && ACCEPTED_MIME.includes(file.type);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      style={{ animation: 'cv-spin 0.9s linear infinite', display: 'block' }}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2 a10 10 0 0 1 10 10" />
    </svg>
  );
}

// ── UploadIcon ───────────────────────────────────────────────────────────────
function UploadIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M7 9l5-5 5 5" />
      <line x1="12" y1="4" x2="12" y2="16" />
    </svg>
  );
}

// ── FileIcon ─────────────────────────────────────────────────────────────────
function FileIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export function CVUpload({ lang = 'fr', theme = 'light' }) {
  const navigate = useNavigate();
  const { interviewToken } = useParams();
  const { role, session } = useCandidate();

  // If no valid session, bounce to home
  React.useEffect(() => {
    if (!session || session.interview_token !== interviewToken) {
      navigate('/');
    }
  }, [session, interviewToken, navigate]);

  const sessionLang = role?.language || lang;
  const S = STRINGS[sessionLang] || STRINGS.fr;

  // ── input mode: 'file' | 'paste' ─────────────────────────────────────────
  const [mode, setMode] = React.useState('file');

  // ── file state ───────────────────────────────────────────────────────────
  const [file, setFile] = React.useState(null);
  const [fileError, setFileError] = React.useState(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // ── paste state ──────────────────────────────────────────────────────────
  const [pastedText, setPastedText] = React.useState('');
  const [textError, setTextError] = React.useState(null);

  // ── consent + why-open ───────────────────────────────────────────────────
  const [consent, setConsent] = React.useState(false);
  const [whyOpen, setWhyOpen] = React.useState(false);
  const consentErrorId = 'cv-consent-error';
  const charCounterId = 'cv-char-counter';

  // ── submission state ─────────────────────────────────────────────────────
  const [status, setStatus] = React.useState('idle'); // 'idle' | 'loading' | 'timeout' | 'success' | 'error'
  const [serverError, setServerError] = React.useState(null); // message
  const [isNotFound, setIsNotFound] = React.useState(false);
  const timeoutRef = React.useRef(null);

  // aria live region ref for success / error announcements
  const liveRef = React.useRef(null);

  // ── cleanup on unmount ───────────────────────────────────────────────────
  React.useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // ── helpers ───────────────────────────────────────────────────────────────
  const hasInput = mode === 'file' ? file !== null : pastedText.trim().length >= MIN_TEXT_CHARS;
  const canSubmit = hasInput && consent && status === 'idle';
  const isSubmitDisabled = !canSubmit;

  function clearFileError() { setFileError(null); }
  function clearTextError() { setTextError(null); }

  function selectFile(f) {
    clearFileError();
    if (!isValidFile(f)) {
      const ext = getFileExtension(f.name);
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setFileError(S.cv_file_wrong_type);
      } else if (f.size > MAX_FILE_BYTES) {
        setFileError(S.cv_file_too_large);
      } else {
        setFileError(S.cv_file_wrong_type);
      }
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError(S.cv_file_too_large);
      return;
    }
    setFile(f);
  }

  // ── drop zone handlers ───────────────────────────────────────────────────
  function handleDragEnter(e) { e.preventDefault(); e.stopPropagation(); setDragActive(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDragActive(false); }
  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) selectFile(dropped);
  }
  function handleDropKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function handleFileChange(e) {
    const picked = e.target.files?.[0];
    if (picked) selectFile(picked);
    // reset the input so re-selecting the same file triggers onChange
    e.target.value = '';
  }

  // ── advance to live ───────────────────────────────────────────────────────
  function goToLive() {
    navigate(`/interviews/${interviewToken}/live`);
  }

  // ── skip ─────────────────────────────────────────────────────────────────
  function handleSkip() {
    goToLive();
  }

  // ── submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!canSubmit) return;

    // client-side validation
    if (mode === 'paste') {
      const trimmed = pastedText.trim();
      if (trimmed.length < MIN_TEXT_CHARS) {
        setTextError(S.cv_text_too_short);
        return;
      }
      clearTextError();
    }

    setStatus('loading');
    setServerError(null);
    setIsNotFound(false);

    // 12s timeout → show non-blocking long-load message
    timeoutRef.current = setTimeout(() => {
      setStatus('timeout');
    }, ANALYSIS_TIMEOUT_MS);

    try {
      let result;
      if (mode === 'file') {
        result = await api.uploadCV(interviewToken, file, true);
      } else {
        result = await api.uploadCVText(interviewToken, pastedText.trim(), true);
      }
      clearTimeout(timeoutRef.current);

      // Backend may return parsing_status: "failed" with 200 — still advance
      if (result?.parsing_status === 'failed') {
        // Show neutral info — don't block the candidate
        setStatus('success');
        setTimeout(goToLive, 1500);
      } else {
        setStatus('success');
        setTimeout(goToLive, 1000);
      }
    } catch (err) {
      clearTimeout(timeoutRef.current);
      const httpStatus = err.status;
      if (httpStatus === 404) {
        setIsNotFound(true);
        setStatus('error');
        // Hard redirect — interview is gone
        setTimeout(() => navigate('/'), 2000);
        return;
      }
      if (httpStatus === 409) {
        // Interview already completed — navigate to done
        navigate(`/interviews/${interviewToken}/done`);
        return;
      }
      if (httpStatus === 422) {
        setServerError(S.cv_error_422);
      } else {
        setServerError(S.cv_error_server);
      }
      setStatus('error');
    }
  }

  if (!role) return null;

  const isDark = theme === 'dark';

  return (
    <>
      <style>{`
        @keyframes cv-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cv-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cv-fade { animation: cv-fadein 0.25s ease both; }
      `}</style>

      <div className="rt-app-page">
        <div data-theme={theme} className="rt-root" style={{
          width: 1280,
          minHeight: 820,
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--sans)',
        }}>
          {/* ── header ─────────────────────────────────────────────────── */}
          <div style={{
            padding: '18px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
          }}>
            <Logo size={22} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {sessionLang === 'fr'
                ? 'Entretien sécurisé · chiffré de bout en bout'
                : 'Secure interview · end-to-end encrypted'}
            </span>
          </div>

          {/* ── body ────────────────────────────────────────────────────── */}
          <div style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '48px 56px',
          }}>
            <div style={{ width: '100%', maxWidth: 640 }}>

              {/* step badge */}
              <span className="rt-pill" style={{ background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)' }}>
                <SparkleIcon size={12} fill="currentColor" /> {S.cv_optional_label}
              </span>

              {/* heading */}
              <h1 className="rt-serif" style={{ fontSize: 38, lineHeight: 1.1, margin: '14px 0 0', color: 'var(--ink)' }}>
                {S.cv_step_title}
              </h1>
              <p style={{ fontSize: 15, color: 'var(--muted)', marginTop: 12, lineHeight: 1.6, maxWidth: 540 }}>
                {S.cv_step_subtitle}
              </p>

              {/* ── mode tabs ──────────────────────────────────────────── */}
              <div role="tablist" aria-label={sessionLang === 'fr' ? "Mode de saisie du CV" : "CV input mode"} style={{ display: 'flex', gap: 8, marginTop: 28, marginBottom: 24 }}>
                {(['file', 'paste']).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    aria-controls={`cv-panel-${m}`}
                    id={`cv-tab-${m}`}
                    onClick={() => { setMode(m); clearFileError(); clearTextError(); setServerError(null); setStatus('idle'); }}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 12,
                      border: '1px solid',
                      borderColor: mode === m ? 'var(--terracotta)' : 'var(--border)',
                      background: mode === m ? 'var(--terracotta-soft)' : 'var(--surface)',
                      color: mode === m ? 'var(--terracotta-deep)' : 'var(--muted)',
                      fontWeight: mode === m ? 600 : 400,
                      fontSize: 14,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                    onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                  >
                    {m === 'file' ? S.cv_input_file : S.cv_input_paste}
                  </button>
                ))}
              </div>

              {/* ── file panel ─────────────────────────────────────────── */}
              <div
                id="cv-panel-file"
                role="tabpanel"
                aria-labelledby="cv-tab-file"
                style={{ display: mode === 'file' ? 'block' : 'none' }}
              >
                {/* hidden file input */}
                <input
                  ref={fileInputRef}
                  id="cv-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  aria-hidden="true"
                  tabIndex={-1}
                />

                {/* drop zone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={dragActive ? S.cv_drop_zone_active : S.cv_drop_zone_label}
                  aria-describedby="cv-file-formats"
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={handleDropKeyDown}
                  style={{
                    border: `2px dashed ${dragActive ? 'var(--terracotta)' : file ? 'var(--sage)' : 'var(--border)'}`,
                    borderRadius: 18,
                    padding: '40px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragActive ? 'var(--terracotta-soft)' : 'var(--surface)',
                    transition: 'border-color 150ms, background 150ms',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                >
                  {file ? (
                    <div className="cv-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--sage-soft)' }}>
                        <FileIcon size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{file.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{formatBytes(file.size)}</div>
                      </div>
                      <button
                        type="button"
                        aria-label={sessionLang === 'fr' ? "Supprimer le fichier sélectionné" : "Remove selected file"}
                        onClick={(e) => { e.stopPropagation(); setFile(null); setConsent(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--muted)', fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <XIcon size={12} />
                        {sessionLang === 'fr' ? 'Supprimer' : 'Remove'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--muted)' }}>
                      <UploadIcon size={36} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)' }}>
                          {dragActive ? S.cv_drop_zone_active : S.cv_drop_zone_label}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          style={{
                            marginTop: 8, padding: '7px 18px',
                            border: '1px solid var(--border)', borderRadius: 10,
                            background: 'var(--surface)', color: 'var(--ink-2)',
                            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                          onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                          onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                        >
                          {S.cv_browse_button}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div id="cv-file-formats" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                  {S.cv_accepted_formats}
                </div>

                {/* file validation error */}
                {fileError && (
                  <div role="alert" style={{ marginTop: 10, fontSize: 13, color: 'var(--terracotta-deep)', padding: '10px 14px', borderRadius: 10, background: 'var(--terracotta-soft)', border: '1px solid var(--terracotta)' }}>
                    {fileError}
                  </div>
                )}
              </div>

              {/* ── paste panel ─────────────────────────────────────────── */}
              <div
                id="cv-panel-paste"
                role="tabpanel"
                aria-labelledby="cv-tab-paste"
                style={{ display: mode === 'paste' ? 'block' : 'none' }}
              >
                <label
                  htmlFor="cv-textarea"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 8 }}
                >
                  {sessionLang === 'fr' ? 'Contenu du CV' : 'CV content'}
                </label>
                <textarea
                  id="cv-textarea"
                  rows={12}
                  maxLength={50000}
                  value={pastedText}
                  onChange={(e) => { setPastedText(e.target.value); clearTextError(); }}
                  placeholder={S.cv_paste_placeholder}
                  aria-describedby={`${charCounterId}${textError ? ' cv-text-error' : ''}`}
                  aria-invalid={textError ? 'true' : 'false'}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: `1px solid ${textError ? 'var(--terracotta)' : 'var(--border)'}`,
                    background: 'var(--surface)',
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--ink)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--terracotta)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = textError ? 'var(--terracotta)' : 'var(--border)'; e.currentTarget.style.boxShadow = ''; }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span id={charCounterId} style={{ fontSize: 11, color: 'var(--muted)' }} aria-live="polite">
                    {pastedText.length.toLocaleString()} / 50 000 {S.cv_paste_counter}
                  </span>
                  {pastedText.length > 0 && pastedText.length < MIN_TEXT_CHARS && (
                    <span style={{ fontSize: 11, color: 'var(--terracotta-deep)' }}>
                      {sessionLang === 'fr'
                        ? `${MIN_TEXT_CHARS - pastedText.length} caractères manquants`
                        : `${MIN_TEXT_CHARS - pastedText.length} characters missing`}
                    </span>
                  )}
                </div>
                {textError && (
                  <div id="cv-text-error" role="alert" style={{ marginTop: 10, fontSize: 13, color: 'var(--terracotta-deep)', padding: '10px 14px', borderRadius: 10, background: 'var(--terracotta-soft)', border: '1px solid var(--terracotta)' }}>
                    {textError}
                  </div>
                )}
              </div>

              {/* ── consent block (visible only when has input) ─────────── */}
              {hasInput && (
                <div className="cv-fade" style={{
                  marginTop: 24,
                  padding: '18px 20px',
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <input
                      id="cv-consent-checkbox"
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      aria-required="true"
                      aria-invalid={!consent && status === 'error' ? 'true' : 'false'}
                      aria-describedby={consentErrorId}
                      style={{ marginTop: 3, accentColor: 'var(--terracotta)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <label htmlFor="cv-consent-checkbox" style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, cursor: 'pointer' }}>
                      {S.cv_consent_label}
                    </label>
                  </div>

                  {/* RGPD why explainer */}
                  <div style={{ marginTop: 12, paddingLeft: 24 }}>
                    <button
                      type="button"
                      aria-expanded={whyOpen}
                      aria-controls="cv-rgpd-explanation"
                      onClick={() => setWhyOpen((v) => !v)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: 'var(--muted)',
                        background: 'none', border: 'none',
                        cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                        textDecoration: 'underline',
                      }}
                      onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--terracotta)'; e.currentTarget.style.outlineOffset = '2px'; }}
                      onBlur={(e) => { e.currentTarget.style.outline = ''; }}
                    >
                      {S.cv_consent_why}
                      {whyOpen ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
                    </button>

                    {whyOpen && (
                      <div
                        id="cv-rgpd-explanation"
                        className="cv-fade"
                        style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}
                      >
                        <p style={{ margin: '0 0 6px' }}>{S.cv_consent_explanation}</p>
                        <a
                          href="/privacy-policy"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--terracotta-deep)', textDecoration: 'underline', fontSize: 12 }}
                        >
                          {S.cv_rgpd_policy_link} &rarr;
                        </a>
                      </div>
                    )}
                  </div>

                  {/* consent error (shown if user tries to submit without ticking) */}
                  <div id={consentErrorId} aria-live="assertive" />
                </div>
              )}

              {/* ── loading states ─────────────────────────────────────── */}
              {status === 'loading' && (
                <div role="status" aria-live="polite" aria-label={S.cv_loading} className="cv-fade" style={{
                  marginTop: 20,
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '16px 20px', borderRadius: 14,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <Spinner size={20} />
                  <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{S.cv_loading}</span>
                  <span className="sr-only">Loading…</span>
                </div>
              )}

              {status === 'timeout' && (
                <div className="cv-fade" style={{
                  marginTop: 20,
                  padding: '16px 20px', borderRadius: 14,
                  background: 'var(--terracotta-soft)', border: '1px solid var(--terracotta)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Spinner size={18} />
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--terracotta-deep)', marginBottom: 8 }}>
                        {S.cv_loading_long}
                      </div>
                      <button
                        type="button"
                        onClick={handleSkip}
                        style={{
                          padding: '8px 16px', borderRadius: 10,
                          border: '1px solid var(--terracotta)',
                          background: 'white', color: 'var(--terracotta-deep)',
                          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                          fontWeight: 500,
                        }}
                        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                        onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                      >
                        {S.cv_continue_without}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── server error ────────────────────────────────────────── */}
              {status === 'error' && serverError && (
                <div role="alert" className="cv-fade" style={{
                  marginTop: 20,
                  padding: '16px 20px', borderRadius: 14,
                  background: 'var(--terracotta-soft)', border: '1px solid var(--terracotta)',
                }}>
                  <div style={{ fontSize: 14, color: 'var(--terracotta-deep)', marginBottom: 10 }}>
                    {isNotFound ? S.cv_error_404 : serverError}
                  </div>
                  {!isNotFound && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => { setStatus('idle'); setServerError(null); }}
                        style={{
                          padding: '7px 14px', borderRadius: 10,
                          border: '1px solid var(--terracotta)',
                          background: 'white', color: 'var(--terracotta-deep)',
                          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                        onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                      >
                        {S.cv_retry}
                      </button>
                      <button
                        type="button"
                        onClick={handleSkip}
                        style={{
                          padding: '7px 14px', borderRadius: 10,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)', color: 'var(--muted)',
                          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                        onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                      >
                        {S.cv_continue_without}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── success ─────────────────────────────────────────────── */}
              {status === 'success' && (
                <div role="status" aria-live="polite" className="cv-fade" style={{
                  marginTop: 20,
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 20px', borderRadius: 14,
                  background: 'var(--sage-soft)', border: '1px solid var(--sage)',
                  color: 'var(--sage)',
                }}>
                  <CheckIcon size={16} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{S.cv_received}</span>
                </div>
              )}

              {/* ── bottom action row ──────────────────────────────────── */}
              {(status === 'idle' || status === 'error') && (
                <div style={{
                  marginTop: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  {hasInput && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitDisabled}
                      aria-disabled={isSubmitDisabled}
                      style={{
                        width: '100%',
                        padding: '15px 22px',
                        fontSize: 15,
                        borderRadius: 18,
                        border: 'none',
                        background: isSubmitDisabled
                          ? 'var(--muted)'
                          : 'linear-gradient(135deg, var(--terracotta) 0%, #C85A34 100%)',
                        color: 'white',
                        cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                        opacity: isSubmitDisabled ? 0.5 : 1,
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                      onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                    >
                      {S.cv_submit}
                      <ArrowRight size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSkip}
                    style={{
                      width: '100%',
                      padding: '13px 22px',
                      fontSize: 14,
                      borderRadius: 18,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--terracotta-soft)'; }}
                    onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                  >
                    {S.cv_input_skip}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* aria live region for async announcements */}
              <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
