/* Pre-interview setup — camera/mic check before meeting Aria */

function PreInterview({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];
  const [camReady, setCamReady] = React.useState(true);
  const [micReady, setMicReady] = React.useState(true);
  const [spkReady, setSpkReady] = React.useState(true);
  const [netReady, setNetReady] = React.useState(true);
  const [consent, setConsent] = React.useState(true);
  const [micLevel, setMicLevel] = React.useState(0.3);

  // animate mic level
  React.useEffect(() => {
    const id = setInterval(() => {
      setMicLevel(0.15 + Math.random() * 0.75);
    }, 220);
    return () => clearInterval(id);
  }, []);

  const allReady = camReady && micReady && spkReady && netReady && consent;

  return (
    <div data-theme={theme} className="rt-root" style={{
      width: 1280, height: 820,
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--sans)",
    }}>
      {/* Top bar */}
      <div style={{
        padding: "18px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--border)",
      }}>
        <Logo size={22} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {lang === "fr" ? "Entretien sécurisé · chiffré de bout en bout" : "Secure interview · end-to-end encrypted"}
          </span>
        </div>
      </div>

      {/* Main */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: 40,
        padding: "48px 56px",
        alignItems: "center",
      }}>
        {/* Left — intro + Aria */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span className="rt-pill" style={{ background: "var(--terracotta-soft)", color: "var(--terracotta-deep)" }}>
              <SparkleIcon size={12} fill="currentColor" /> {lang === "fr" ? "Entretien avec IA" : "AI interview"}
            </span>
          </div>
          <h1 className="rt-serif" style={{ fontSize: 54, lineHeight: 1.02, margin: 0, color: "var(--ink)" }}>
            {S.pre_title}
          </h1>
          <p style={{ fontSize: 17, color: "var(--muted)", marginTop: 16, lineHeight: 1.5, maxWidth: 460 }}>
            {S.pre_sub}
          </p>

          {/* Role card */}
          <div className="rt-card" style={{ marginTop: 28, padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{S.pre_role}</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>Senior Backend Engineer</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{S.pre_company}</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>Lumen Labs</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{S.pre_duration}</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>45 {S.pre_minutes}</div>
            </div>
          </div>

          {/* Tips */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)", marginBottom: 10 }}>{S.pre_tips_title}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {[S.pre_tip_1, S.pre_tip_2, S.pre_tip_3].map((t, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--muted)" }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 999,
                    background: "var(--sage-soft)",
                    color: "var(--sage)",
                    display: "grid", placeItems: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <CheckIcon size={11} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right — camera preview + checks */}
        <div>
          <div style={{
            position: "relative",
            aspectRatio: "4/3",
            borderRadius: 24,
            overflow: "hidden",
            background: "#1A1612",
            boxShadow: "var(--shadow-lg)",
          }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <CandidateWebcam width="100%" height="100%" name={lang === "fr" ? "Vous" : "You"} cameraOff={!camReady} />
            </div>

            {/* Aria bubble top-right */}
            <div style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(255,253,250,0.92)",
              backdropFilter: "blur(12px)",
              borderRadius: 16,
              padding: "10px 14px 10px 10px",
              display: "flex", alignItems: "center", gap: 10,
              border: "1px solid rgba(255,255,255,0.4)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}>
              <AriaOrb size={34} state="idle" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Aria</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
                  {lang === "fr" ? "En attente..." : "Waiting..."}
                </div>
              </div>
            </div>

            {/* Bottom status */}
            <div style={{
              position: "absolute", bottom: 14, left: 14, right: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{
                background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
                color: "#FFF", fontSize: 12, padding: "6px 12px", borderRadius: 999,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <LiveDot /> {lang === "fr" ? "Caméra active" : "Camera on"}
              </div>
              {/* Mic level */}
              <div style={{
                background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
                padding: "6px 10px", borderRadius: 999,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <MicIcon size={12} />
                <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 12 }}>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const active = micLevel > (i + 1) / 5 - 0.1;
                    return (
                      <div key={i} style={{
                        width: 2.5, height: 4 + i * 2,
                        background: active ? "#E8734A" : "rgba(255,255,255,0.3)",
                        borderRadius: 1,
                        transition: "background 120ms",
                      }} />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Check list */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <CheckRow icon={<CamIcon />} label={S.pre_camera} ok={camReady} onToggle={() => setCamReady(!camReady)} />
            <CheckRow icon={<MicIcon />} label={S.pre_mic} ok={micReady} onToggle={() => setMicReady(!micReady)} />
            <CheckRow icon={<PhoneIcon />} label={S.pre_speaker} ok={spkReady} onToggle={() => setSpkReady(!spkReady)} />
            <CheckRow
              icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M5 12a14 14 0 0 1 14 0M2 8a20 20 0 0 1 20 0M8 16a8 8 0 0 1 8 0M12 20h.01" /></svg>}
              label={S.pre_connection} ok={netReady} onToggle={() => setNetReady(!netReady)}
            />
          </div>

          {/* Consent + start */}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ accentColor: "var(--terracotta)" }} />
              {S.pre_consent}
            </label>
          </div>
          <button
            className="rt-btn rt-btn-accent"
            disabled={!allReady}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "16px 22px",
              fontSize: 15,
              borderRadius: 18,
              opacity: allReady ? 1 : 0.5,
              cursor: allReady ? "pointer" : "not-allowed",
            }}
          >
            {S.pre_start} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ icon, label, ok, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <span style={{
        width: 32, height: 32, borderRadius: 10,
        background: ok ? "var(--sage-soft)" : "var(--terracotta-soft)",
        color: ok ? "var(--sage)" : "var(--terracotta-deep)",
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{label}</div>
        <div style={{ fontSize: 11, color: ok ? "var(--sage)" : "var(--terracotta-deep)" }}>
          {ok ? "OK" : "⚠"}
        </div>
      </div>
    </button>
  );
}

Object.assign(window, { PreInterview });
