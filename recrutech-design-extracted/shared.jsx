/* Shared primitives for RecruteTech / Aria designs */

const { useState, useEffect, useRef, useMemo } = React;

// ---------- i18n ----------
const STRINGS = {
  fr: {
    // Brand
    brand: "RecruteTech",
    ariaBy: "Aria · par RecruteTech",
    // Pre-interview
    pre_title: "Prêt à rencontrer Aria ?",
    pre_sub: "Aria est votre interviewer IA. Quelques vérifications avant de commencer.",
    pre_role: "Poste",
    pre_company: "Entreprise",
    pre_duration: "Durée estimée",
    pre_minutes: "min",
    pre_camera: "Caméra",
    pre_mic: "Micro",
    pre_speaker: "Haut-parleurs",
    pre_connection: "Connexion",
    pre_ready: "Tout est prêt",
    pre_start: "Commencer l'entretien",
    pre_tips_title: "Avant de commencer",
    pre_tip_1: "Trouvez un endroit calme et bien éclairé",
    pre_tip_2: "Parlez naturellement — Aria comprend les pauses",
    pre_tip_3: "Vous pouvez demander à Aria de reformuler à tout moment",
    pre_consent: "J'accepte l'enregistrement de l'entretien",
    // Live
    live_stage: "Étape",
    live_stages: ["Présentation", "Expérience", "Technique", "Code Review", "Questions"],
    live_remaining: "Temps restant",
    live_aria_speaking: "Aria parle",
    live_aria_listening: "Aria écoute",
    live_aria_thinking: "Aria réfléchit",
    live_you: "Vous",
    live_transcript: "Transcription",
    live_end: "Terminer l'entretien",
    live_mute: "Couper le micro",
    live_unmute: "Activer le micro",
    live_camera_off: "Désactiver la caméra",
    // Coding
    code_title: "Défi de code",
    code_challenge: "Défi",
    code_hint: "Indice",
    code_run: "Exécuter",
    code_submit: "Soumettre",
    code_stuck: "Je suis bloqué",
    code_output: "Sortie",
    // Summary
    sum_title: "Merci !",
    sum_sub: "Votre entretien est terminé. Aria est en train d'analyser vos réponses.",
    sum_duration: "Durée",
    sum_questions: "Questions",
    sum_highlights: "Points forts détectés",
    sum_next: "Prochaines étapes",
    sum_feedback_in: "Retour détaillé sous 24h",
    // HR
    hr_interviews: "Entretiens",
    hr_candidates: "Candidats",
    hr_new: "Nouvel entretien",
    hr_status_new: "Nouveau",
    hr_status_review: "À revoir",
    hr_status_shortlist: "Présélectionné",
    hr_status_declined: "Refusé",
    hr_score: "Score Aria",
    hr_filter_all: "Tous",
    hr_filter_role: "Poste",
    hr_search: "Rechercher un candidat...",
    // Detail
    det_transcript: "Transcription",
    det_evaluation: "Évaluation",
    det_moments: "Moments clés",
    det_download: "Télécharger le rapport",
    det_shortlist: "Présélectionner",
    // Config
    cfg_title: "Configurer un entretien",
    cfg_role: "Intitulé du poste",
    cfg_seniority: "Séniorité",
    cfg_duration: "Durée totale",
    cfg_stages: "Étapes",
    cfg_skills: "Compétences évaluées",
    cfg_tone: "Ton d'Aria",
    cfg_language: "Langue",
    cfg_preview: "Prévisualiser",
    cfg_publish: "Publier le lien",
  },
  en: {
    brand: "RecruteTech",
    ariaBy: "Aria · by RecruteTech",
    pre_title: "Ready to meet Aria?",
    pre_sub: "Aria is your AI interviewer. A few checks before we start.",
    pre_role: "Role",
    pre_company: "Company",
    pre_duration: "Estimated duration",
    pre_minutes: "min",
    pre_camera: "Camera",
    pre_mic: "Microphone",
    pre_speaker: "Speakers",
    pre_connection: "Connection",
    pre_ready: "All set",
    pre_start: "Start the interview",
    pre_tips_title: "Before we begin",
    pre_tip_1: "Find a quiet, well-lit spot",
    pre_tip_2: "Speak naturally — Aria understands pauses",
    pre_tip_3: "Ask Aria to rephrase anytime",
    pre_consent: "I consent to the interview being recorded",
    live_stage: "Stage",
    live_stages: ["Introduction", "Experience", "Technical", "Code Review", "Questions"],
    live_remaining: "Time remaining",
    live_aria_speaking: "Aria is speaking",
    live_aria_listening: "Aria is listening",
    live_aria_thinking: "Aria is thinking",
    live_you: "You",
    live_transcript: "Transcript",
    live_end: "End interview",
    live_mute: "Mute",
    live_unmute: "Unmute",
    live_camera_off: "Turn camera off",
    code_title: "Coding challenge",
    code_challenge: "Challenge",
    code_hint: "Hint",
    code_run: "Run",
    code_submit: "Submit",
    code_stuck: "I'm stuck",
    code_output: "Output",
    sum_title: "Thank you!",
    sum_sub: "Your interview is complete. Aria is analyzing your answers.",
    sum_duration: "Duration",
    sum_questions: "Questions",
    sum_highlights: "Strengths detected",
    sum_next: "Next steps",
    sum_feedback_in: "Detailed feedback in 24h",
    hr_interviews: "Interviews",
    hr_candidates: "Candidates",
    hr_new: "New interview",
    hr_status_new: "New",
    hr_status_review: "Review",
    hr_status_shortlist: "Shortlist",
    hr_status_declined: "Declined",
    hr_score: "Aria score",
    hr_filter_all: "All",
    hr_filter_role: "Role",
    hr_search: "Search candidates...",
    det_transcript: "Transcript",
    det_evaluation: "Evaluation",
    det_moments: "Key moments",
    det_download: "Download report",
    det_shortlist: "Shortlist",
    cfg_title: "Configure an interview",
    cfg_role: "Role title",
    cfg_seniority: "Seniority",
    cfg_duration: "Total duration",
    cfg_stages: "Stages",
    cfg_skills: "Skills assessed",
    cfg_tone: "Aria's tone",
    cfg_language: "Language",
    cfg_preview: "Preview",
    cfg_publish: "Publish link",
  },
};

// ---------- Logo ----------
function Logo({ size = 22, showText = true, lang = "fr" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <defs>
          <radialGradient id="rtlogo" cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#F4A781" />
            <stop offset="55%" stopColor="#E8734A" />
            <stop offset="100%" stopColor="#C85A34" />
          </radialGradient>
        </defs>
        <path
          d="M16 2 C22 2 28 7 28 14 C28 19 26 22 22 25 C20 26 18 28 16 31 C14 28 12 26 10 25 C6 22 4 19 4 14 C4 7 10 2 16 2 Z"
          fill="url(#rtlogo)"
        />
        <circle cx="16" cy="14" r="3.5" fill="#FBF7F2" opacity="0.95" />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: "var(--serif)",
            fontSize: size * 0.9,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          RecruteTech
        </span>
      )}
    </div>
  );
}

// ---------- Aria Orb ----------
// Animated blob that represents Aria. state: 'idle' | 'speaking' | 'listening' | 'thinking'
function AriaOrb({ size = 120, state = "idle", palette = "warm" }) {
  const palettes = {
    warm: { a: "#F4A781", b: "#E8734A", c: "#C85A34", glow: "rgba(232,115,74,0.35)" },
    sage: { a: "#A8C7B8", b: "#2E5D4F", c: "#1F4236", glow: "rgba(46,93,79,0.35)" },
    plum: { a: "#C999A8", b: "#6B4A5C", c: "#4A3341", glow: "rgba(107,74,92,0.35)" },
  };
  const p = palettes[palette] || palettes.warm;
  const intensity = state === "speaking" ? 1 : state === "listening" ? 0.5 : state === "thinking" ? 0.7 : 0.3;
  const speed = state === "speaking" ? "2.2s" : state === "thinking" ? "3s" : "5s";
  const innerId = useMemo(() => "orb-" + Math.random().toString(36).slice(2, 8), []);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
      }}
    >
      {/* Outer glow ring, reacts to state */}
      <div
        style={{
          position: "absolute",
          inset: -size * 0.15,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${p.glow} 0%, transparent 65%)`,
          opacity: intensity,
          animation: `aria-breathe ${speed} ease-in-out infinite`,
        }}
      />
      {/* Core orb */}
      <div
        className="aria-orb-core"
        style={{
          width: size * 0.82,
          height: size * 0.82,
          background: `radial-gradient(circle at 30% 30%, ${p.a}, ${p.b} 55%, ${p.c} 100%)`,
          boxShadow: `inset -${size * 0.08}px -${size * 0.12}px ${size * 0.2}px rgba(0,0,0,0.25), inset ${size * 0.06}px ${size * 0.06}px ${size * 0.15}px rgba(255,255,255,0.35)`,
          animationDuration: `${7}s, ${speed}`,
        }}
      />
      {/* Speaking waveform overlay */}
      {state === "speaking" && (
        <div
          style={{
            position: "absolute",
            bottom: size * 0.22,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "flex-end",
            gap: 3,
            height: size * 0.2,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: size * 0.03,
                height: "100%",
                background: "rgba(255,255,255,0.85)",
                borderRadius: 999,
                transformOrigin: "bottom",
                animation: `wave-bar 0.9s ease-in-out ${i * 0.12}s infinite`,
              }}
            />
          ))}
        </div>
      )}
      {/* Thinking dots */}
      {state === "thinking" && (
        <div
          style={{
            position: "absolute",
            bottom: size * 0.28,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: size * 0.05,
                height: size * 0.05,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.8)",
                animation: `wave-bar 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Candidate webcam stub ----------
// Portrait placeholder for candidate self-view
function CandidateWebcam({ width = 220, height = 160, name = "Vous", muted = false, cameraOff = false }) {
  const initial = (name || "?").slice(0, 1).toUpperCase();
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 18,
        overflow: "hidden",
        background: cameraOff
          ? "linear-gradient(135deg, #2A241E, #1A1612)"
          : "linear-gradient(135deg, #E8C9B4 0%, #C89A7A 55%, #8B6349 100%)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {!cameraOff && (
        <>
          {/* Stylized portrait silhouette */}
          <svg
            viewBox="0 0 200 160"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {/* shoulders */}
            <ellipse cx="100" cy="180" rx="90" ry="60" fill="#6B4A35" opacity="0.7" />
            {/* head */}
            <ellipse cx="100" cy="80" rx="34" ry="40" fill="#C89A7A" />
            {/* hair */}
            <path d="M 66 70 Q 68 42 100 40 Q 132 42 134 70 Q 130 52 100 52 Q 70 52 66 70 Z" fill="#3E2A1C" />
            {/* shirt */}
            <path d="M 40 160 Q 60 130 100 130 Q 140 130 160 160 L 160 160 L 40 160 Z" fill="#2E5D4F" />
          </svg>
          {/* soft vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.25) 100%)",
            }}
          />
        </>
      )}
      {cameraOff && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#F5EEE3",
            fontFamily: "var(--serif)",
            fontSize: 48,
          }}
        >
          {initial}
        </div>
      )}
      {/* label */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          color: "#FFF",
          fontSize: 11,
          fontWeight: 500,
          padding: "4px 10px",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {muted ? <MicOffIcon size={11} /> : <LiveDot />}
        {name}
      </div>
    </div>
  );
}

function LiveDot() {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: "#E8734A",
        boxShadow: "0 0 0 4px rgba(232,115,74,0.25)",
        display: "inline-block",
      }}
    />
  );
}

// ---------- Icons (minimal stroke set) ----------
function Icon({ children, size = 16, stroke = "currentColor", fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const MicIcon = ({ size = 16 }) => (
  <Icon size={size}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Icon>
);
const MicOffIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M3 3l18 18M9 9v2a3 3 0 0 0 5.12 2.12M15 9V6a3 3 0 0 0-5.94-.6M5 11a7 7 0 0 0 11.9 5M19 11a7 7 0 0 0-.4-2.3M12 18v3" /></Icon>
);
const CamIcon = ({ size = 16 }) => (
  <Icon size={size}><rect x="2" y="6" width="14" height="12" rx="3" /><path d="M16 10l6-3v10l-6-3z" /></Icon>
);
const CamOffIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M3 3l18 18M16 10l6-3v10M2 6h12l2 2v6a2 2 0 0 1-2 2H6" /></Icon>
);
const CodeIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" /></Icon>
);
const ClockIcon = ({ size = 16 }) => (
  <Icon size={size}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);
const CheckIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M20 6L9 17l-5-5" /></Icon>
);
const ChevronRight = ({ size = 16 }) => (
  <Icon size={size}><path d="M9 6l6 6-6 6" /></Icon>
);
const SearchIcon = ({ size = 16 }) => (
  <Icon size={size}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>
);
const PlusIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M12 5v14M5 12h14" /></Icon>
);
const DownloadIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></Icon>
);
const SparkleIcon = ({ size = 16, fill = "none" }) => (
  <Icon size={size} fill={fill}><path d="M12 3l1.8 4.8L18 10l-4.2 2.2L12 17l-1.8-4.8L6 10l4.2-2.2z" /></Icon>
);
const ArrowRight = ({ size = 16 }) => (
  <Icon size={size}><path d="M5 12h14M13 5l7 7-7 7" /></Icon>
);
const MoreIcon = ({ size = 16 }) => (
  <Icon size={size}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></Icon>
);
const PauseIcon = ({ size = 16 }) => (
  <Icon size={size}><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></Icon>
);
const PhoneIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M22 16.9v2.8a2 2 0 0 1-2.2 2A20 20 0 0 1 2.3 4.2 2 2 0 0 1 4.3 2h2.8a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6.2 6.2l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z" /></Icon>
);

// ---------- Export to window ----------
Object.assign(window, {
  STRINGS,
  Logo,
  AriaOrb,
  CandidateWebcam,
  LiveDot,
  MicIcon, MicOffIcon, CamIcon, CamOffIcon, CodeIcon, ClockIcon,
  CheckIcon, ChevronRight, SearchIcon, PlusIcon, DownloadIcon,
  SparkleIcon, ArrowRight, MoreIcon, PauseIcon, PhoneIcon,
});
