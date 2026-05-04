/* Live interview — Aria speaking + candidate video + transcript + timer */

function LiveInterview({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];
  const [elapsed, setElapsed] = React.useState(8 * 60 + 42); // seconds since start
  const [ariaState, setAriaState] = React.useState("speaking"); // speaking/listening/thinking/idle
  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(false);
  const [transcript, setTranscript] = React.useState([
    { who: "aria", text: lang === "fr" ? "Bonjour ! Je suis Aria, votre interviewer IA aujourd'hui. Ravi de vous rencontrer." : "Hello! I'm Aria, your AI interviewer today. Nice to meet you." },
    { who: "you", text: lang === "fr" ? "Bonjour Aria, ravi également !" : "Hi Aria, nice to meet you too!" },
    { who: "aria", text: lang === "fr" ? "Parfait. Pour commencer, pouvez-vous me parler d'un projet récent dont vous êtes particulièrement fier ?" : "Great. To start, can you tell me about a recent project you're especially proud of?" },
    { who: "you", text: lang === "fr" ? "Bien sûr. Récemment, j'ai conçu un pipeline d'ingestion temps réel qui traite environ 2M d'événements par minute..." : "Sure. Recently I designed a real-time ingestion pipeline processing ~2M events per minute..." },
  ]);
  const [currentAria, setCurrentAria] = React.useState(
    lang === "fr"
      ? "Vous avez mentionné un pipeline temps réel. Quels trade-offs avez-vous faits entre latence et cohérence ?"
      : "You mentioned a real-time pipeline. What trade-offs did you make between latency and consistency?"
  );

  // Timer
  React.useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Cycle Aria state
  React.useEffect(() => {
    const id = setInterval(() => {
      setAriaState(s => {
        const cycle = ["speaking", "listening", "thinking", "speaking"];
        return cycle[(cycle.indexOf(s) + 1) % cycle.length];
      });
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const total = 45 * 60;
  const remaining = Math.max(0, total - elapsed);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const currentStage = 2; // technical
  const stageProgress = 0.35;

  const statusText = ariaState === "speaking" ? S.live_aria_speaking
    : ariaState === "listening" ? S.live_aria_listening
    : ariaState === "thinking" ? S.live_aria_thinking
    : "Aria";

  return (
    <div data-theme={theme} className="rt-root" style={{
      width: 1280, height: 820,
      background: "var(--bg-deep)",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--sans)",
      color: "var(--ink)",
    }}>
      {/* Top bar */}
      <div style={{
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Logo size={20} />
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          {/* Stage tracker */}
          <StageTracker stages={S.live_stages} current={currentStage} progress={stageProgress} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClockIcon size={14} />
            <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>
              <span style={{ color: "var(--muted)", marginRight: 6, fontSize: 11 }}>{S.live_remaining}</span>
              {fmt(remaining)}
            </div>
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: 999, background: "var(--terracotta)",
            boxShadow: "0 0 0 4px var(--terracotta-soft)",
          }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--terracotta-deep)" }}>REC</span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", gap: 0, overflow: "hidden" }}>
        {/* Aria stage */}
        <div style={{
          position: "relative",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: `
            radial-gradient(ellipse 80% 60% at 50% 35%, var(--terracotta-soft) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 80%, var(--sage-soft) 0%, transparent 55%),
            var(--bg)
          `,
          padding: 40,
        }}>
          {/* Aria orb */}
          <div style={{ transform: "translateY(-20px)" }}>
            <AriaOrb size={240} state={ariaState} />
          </div>

          {/* Status + transcript of current utterance */}
          <div style={{ marginTop: 36, textAlign: "center", maxWidth: 640 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              fontSize: 12,
              color: "var(--muted)",
              marginBottom: 16,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 999,
                background: ariaState === "listening" ? "var(--sage)" : "var(--terracotta)",
                animation: "aria-breathe 1.6s ease-in-out infinite",
              }} />
              {statusText}
            </div>
            {ariaState === "speaking" && (
              <p className="rt-serif" style={{
                fontSize: 28, lineHeight: 1.25, color: "var(--ink)",
                margin: 0,
                fontStyle: "italic",
                letterSpacing: "-0.01em",
              }}>
                “{currentAria}”
              </p>
            )}
            {ariaState === "listening" && (
              <div>
                <p className="rt-serif" style={{ fontSize: 24, color: "var(--muted)", margin: 0, fontStyle: "italic" }}>
                  {lang === "fr" ? "Prenez votre temps..." : "Take your time..."}
                </p>
                {/* Listening waveform */}
                <div style={{ display: "flex", gap: 3, alignItems: "center", justifyContent: "center", marginTop: 20, height: 40 }}>
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} style={{
                      width: 3, height: "100%",
                      background: "var(--sage)",
                      opacity: 0.6,
                      borderRadius: 2,
                      transformOrigin: "center",
                      animation: `wave-bar ${0.7 + (i % 5) * 0.15}s ease-in-out ${i * 0.04}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            {ariaState === "thinking" && (
              <p className="rt-serif" style={{ fontSize: 24, color: "var(--muted)", margin: 0, fontStyle: "italic" }}>
                {lang === "fr" ? "Un instant..." : "One moment..."}
              </p>
            )}
          </div>

          {/* Candidate webcam PIP */}
          <div style={{ position: "absolute", bottom: 24, left: 24 }}>
            <CandidateWebcam width={180} height={135} name={lang === "fr" ? "Vous" : S.live_you} muted={muted} cameraOff={camOff} />
          </div>

          {/* Controls */}
          <div style={{
            position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 10, alignItems: "center",
            padding: "8px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            boxShadow: "var(--shadow-md)",
          }}>
            <ControlBtn active={!muted} onClick={() => setMuted(!muted)} title={muted ? S.live_unmute : S.live_mute}>
              {muted ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
            </ControlBtn>
            <ControlBtn active={!camOff} onClick={() => setCamOff(!camOff)} title={S.live_camera_off}>
              {camOff ? <CamOffIcon size={18} /> : <CamIcon size={18} />}
            </ControlBtn>
            <ControlBtn>
              <MoreIcon size={18} />
            </ControlBtn>
            <div style={{ width: 1, height: 24, background: "var(--border)" }} />
            <button className="rt-btn" style={{
              background: "#B94A3B", color: "#FFF",
              border: "none",
              padding: "8px 16px",
              fontSize: 13,
            }}>
              <PhoneIcon size={14} /> {S.live_end}
            </button>
          </div>
        </div>

        {/* Transcript sidebar */}
        <div style={{
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{S.live_transcript}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {lang === "fr" ? "En direct · auto-traduction" : "Live · auto-transcribed"}
              </div>
            </div>
            <button style={{
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--muted)", borderRadius: 999, padding: "4px 10px",
              fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            }}>{lang === "fr" ? "Pause" : "Pause"}</button>
          </div>
          <div className="rt-scroll" style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            {transcript.map((msg, i) => (
              <TranscriptMsg key={i} msg={msg} lang={lang} />
            ))}
            {/* Currently speaking (live) */}
            {ariaState === "speaking" && (
              <TranscriptMsg msg={{ who: "aria", text: currentAria }} live lang={lang} />
            )}
          </div>

          {/* Insights footer */}
          <div style={{
            padding: "14px 20px",
            background: "var(--bg)",
            borderTop: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {lang === "fr" ? "Observation Aria" : "Aria notes"}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <InsightChip label={lang === "fr" ? "Clarté élevée" : "High clarity"} color="sage" />
              <InsightChip label={lang === "fr" ? "Expérience confirmée" : "Experienced"} color="sage" />
              <InsightChip label={lang === "fr" ? "À creuser: scaling" : "Explore: scaling"} color="butter" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageTracker({ stages, current, progress }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {stages.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 999,
                background: done ? "var(--sage)" : active ? "var(--terracotta)" : "var(--bg-deep)",
                color: done || active ? "#FFF" : "var(--muted)",
                display: "grid", placeItems: "center",
                fontSize: 10, fontWeight: 600,
                border: "1px solid " + (done ? "var(--sage)" : active ? "var(--terracotta)" : "var(--border)"),
              }}>
                {done ? <CheckIcon size={10} /> : i + 1}
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--ink)" : done ? "var(--muted)" : "var(--muted-2)",
              }}>{s}</span>
            </div>
            {i < stages.length - 1 && (
              <div style={{
                width: 24, height: 2, borderRadius: 2,
                background: done ? "var(--sage)" : "var(--border)",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TranscriptMsg({ msg, live, lang }) {
  const isAria = msg.who === "aria";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      {isAria ? (
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <AriaOrb size={26} state="idle" />
        </div>
      ) : (
        <div style={{
          width: 26, height: 26, borderRadius: 999,
          background: "var(--sage-soft)", color: "var(--sage)",
          display: "grid", placeItems: "center",
          fontSize: 11, fontWeight: 600,
          flexShrink: 0, marginTop: 2,
        }}>
          {lang === "fr" ? "V" : "Y"}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", marginBottom: 3 }}>
          {isAria ? "Aria" : (lang === "fr" ? "Vous" : "You")}
          {live && (
            <span style={{ marginLeft: 6, color: "var(--terracotta)", fontWeight: 400 }}>
              · {lang === "fr" ? "en cours" : "live"}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--ink-2)",
          opacity: live ? 0.75 : 1,
        }}>
          {msg.text}
          {live && <span className="aria-cursor" style={{
            display: "inline-block",
            width: 6, height: 14,
            background: "var(--terracotta)",
            marginLeft: 3,
            verticalAlign: "text-bottom",
            animation: "aria-breathe 0.8s steps(1) infinite",
          }} />}
        </div>
      </div>
    </div>
  );
}

function InsightChip({ label, color }) {
  const map = {
    sage: { bg: "var(--sage-soft)", fg: "var(--sage)" },
    terracotta: { bg: "var(--terracotta-soft)", fg: "var(--terracotta-deep)" },
    butter: { bg: "#F5EBD2", fg: "#8F6B1E" },
  };
  const c = map[color] || map.sage;
  return (
    <span style={{
      fontSize: 11, padding: "3px 9px",
      background: c.bg, color: c.fg,
      borderRadius: 999, fontWeight: 500,
    }}>
      {label}
    </span>
  );
}

function ControlBtn({ children, active = true, onClick, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 42, height: 42, borderRadius: 999,
        background: active ? "var(--bg)" : "#B94A3B",
        color: active ? "var(--ink)" : "#FFF",
        border: "1px solid " + (active ? "var(--border)" : "transparent"),
        cursor: "pointer",
        display: "grid", placeItems: "center",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

Object.assign(window, { LiveInterview });
