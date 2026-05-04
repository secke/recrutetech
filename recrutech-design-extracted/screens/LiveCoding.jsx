/* Live coding challenge — Aria + candidate collaborate on code */

function LiveCoding({ lang = "fr", theme = "light" }) {
  const S = STRINGS[lang];
  const [elapsed, setElapsed] = React.useState(22 * 60 + 14);
  const [ariaState, setAriaState] = React.useState("listening");
  const [output, setOutput] = React.useState(null);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  React.useEffect(() => {
    const id = setInterval(() => {
      setAriaState(s => s === "listening" ? "thinking" : s === "thinking" ? "speaking" : "listening");
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const total = 30 * 60;
  const remaining = Math.max(0, total - elapsed);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const challenge = lang === "fr"
    ? "Implémentez une fonction `groupAnagrams(words)` qui regroupe les anagrammes. L'ordre n'a pas d'importance."
    : "Implement a function `groupAnagrams(words)` that groups anagrams together. Order doesn't matter.";
  const hint = lang === "fr"
    ? "Pensez à une signature commune pour les anagrammes — un tri des caractères fonctionne, mais y a-t-il plus rapide ?"
    : "Think about a shared signature for anagrams — sorting characters works, but is there something faster?";

  const handleRun = () => {
    setRunning(true);
    setOutput(null);
    setTimeout(() => {
      setRunning(false);
      setOutput({
        ok: true,
        text: `[
  ["eat", "tea", "ate"],
  ["tan", "nat"],
  ["bat"]
]`,
        time: "0.8ms",
      });
    }, 900);
  };

  return (
    <div data-theme={theme} className="rt-root" style={{
      width: 1280, height: 820,
      background: "var(--bg-deep)",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--sans)",
    }}>
      {/* Top bar */}
      <div style={{
        padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo size={20} />
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <span className="rt-pill" style={{ background: "var(--terracotta-soft)", color: "var(--terracotta-deep)" }}>
            <CodeIcon size={11} /> {S.code_title}
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {lang === "fr" ? "Étape 4 sur 5" : "Stage 4 of 5"} · {lang === "fr" ? "Partage d'écran actif" : "Screen sharing active"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ClockIcon size={14} />
          <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmt(remaining)}</span>
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <LiveDot /> <span style={{ fontSize: 12, color: "var(--terracotta-deep)", fontWeight: 500 }}>REC</span>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr 300px", overflow: "hidden" }}>
        {/* Left — Aria + challenge brief */}
        <div style={{
          background: "var(--bg)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          padding: 20, gap: 16,
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: 18,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <AriaOrb size={96} state={ariaState} />
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
              {ariaState === "speaking" ? S.live_aria_speaking
                : ariaState === "listening" ? S.live_aria_listening
                : S.live_aria_thinking}
            </div>
          </div>

          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 18, padding: 16,
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {S.code_challenge}
            </div>
            <div className="rt-serif" style={{ fontSize: 20, lineHeight: 1.3, color: "var(--ink)", marginBottom: 10 }}>
              Group Anagrams
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", margin: 0 }}>
              {challenge}
            </p>
            <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted)" }}>
              {lang === "fr" ? "Exemple d'entrée" : "Example input"}
            </div>
            <div className="rt-code" style={{
              background: "var(--bg-deep)", borderRadius: 10, padding: "8px 10px",
              fontSize: 12, color: "var(--ink-2)", marginTop: 4,
            }}>
              ["eat","tea","tan","ate","nat","bat"]
            </div>
          </div>

          <div style={{
            background: "var(--butter)", opacity: 0.95,
            borderRadius: 18, padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#8F6B1E", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <SparkleIcon size={12} fill="currentColor" /> {lang === "fr" ? "Indice d'Aria" : "Aria's hint"}
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0, color: "#5A4514" }}>
              {hint}
            </p>
          </div>

          <button className="rt-btn rt-btn-ghost" style={{ fontSize: 12 }}>
            {S.code_stuck}
          </button>
        </div>

        {/* Editor */}
        <div style={{ display: "flex", flexDirection: "column", background: "#1E1A15" }}>
          {/* File tab */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#15120E", padding: "6px 14px",
            borderBottom: "1px solid #2A241E",
          }}>
            <div style={{ display: "flex", gap: 2 }}>
              <div style={{
                padding: "7px 14px", background: "#1E1A15",
                fontSize: 12, color: "#E8DFD0",
                borderTop: "2px solid var(--terracotta)",
                fontFamily: "var(--mono)",
              }}>
                solution.js
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleRun}
                disabled={running}
                className="rt-btn"
                style={{
                  background: "#3A332B", color: "#F5EEE3",
                  border: "1px solid #4A4238",
                  fontSize: 12, padding: "5px 12px",
                  borderRadius: 8,
                }}>
                {running ? (lang === "fr" ? "Exécution..." : "Running...") : <>▶ {S.code_run}</>}
              </button>
              <button className="rt-btn rt-btn-accent" style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
                {S.code_submit}
              </button>
            </div>
          </div>

          {/* Code area */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <CodeBlock />
          </div>

          {/* Output */}
          <div style={{
            borderTop: "1px solid #2A241E",
            background: "#15120E",
            color: "#E8DFD0",
            padding: "10px 16px",
            minHeight: 140,
            maxHeight: 160,
            overflowY: "auto",
          }} className="rt-scroll">
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#A89E90", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {S.code_output}
              {output && <span style={{ color: "var(--sage-soft)" }}>✓ {lang === "fr" ? "Réussi" : "Passed"} · {output.time}</span>}
              {running && <span>{lang === "fr" ? "en cours..." : "running..."}</span>}
            </div>
            {output ? (
              <pre className="rt-code" style={{ margin: 0, fontSize: 12, color: "#C5E0D1" }}>{output.text}</pre>
            ) : (
              <div style={{ fontSize: 12, color: "#6B635A", fontFamily: "var(--mono)" }}>
                {lang === "fr" ? "// Cliquez sur Exécuter pour tester" : "// Click Run to test"}
              </div>
            )}
          </div>
        </div>

        {/* Right — candidate cam + coaching */}
        <div style={{
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: 16 }}>
            <CandidateWebcam width="100%" height={180} name={lang === "fr" ? "Vous" : "You"} />
          </div>
          <div style={{ padding: "0 16px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {lang === "fr" ? "Approche observée" : "Observed approach"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <ApproachRow label={lang === "fr" ? "Structure de données" : "Data structure"} value="Map" done />
              <ApproachRow label={lang === "fr" ? "Complexité" : "Complexity"} value="O(n·k)" done />
              <ApproachRow label={lang === "fr" ? "Tests" : "Tests"} value={lang === "fr" ? "en cours" : "in progress"} />
              <ApproachRow label={lang === "fr" ? "Cas limites" : "Edge cases"} value={lang === "fr" ? "à discuter" : "to discuss"} />
            </div>
          </div>
          <div style={{ padding: 16, flex: 1, overflowY: "auto" }} className="rt-scroll">
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {lang === "fr" ? "Derniers messages" : "Latest messages"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ChatBubble who="aria" text={lang === "fr" ? "Bonne idée d'utiliser une Map. Comment construiriez-vous la clé ?" : "Nice idea using a Map. How would you build the key?"} />
              <ChatBubble who="you" text={lang === "fr" ? "Je trierais les caractères du mot pour avoir une clé canonique." : "I'd sort the word's characters to get a canonical key."} />
              <ChatBubble who="aria" text={lang === "fr" ? "Ça marche. Voyez-vous une approche O(n·k) sans tri ?" : "That works. Do you see an O(n·k) approach without sorting?"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApproachRow({ label, value, done }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 10px",
      background: done ? "var(--sage-soft)" : "var(--bg)",
      borderRadius: 10,
      fontSize: 12,
    }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ color: done ? "var(--sage)" : "var(--ink-2)", fontWeight: 500 }}>
        {done && "✓ "}{value}
      </span>
    </div>
  );
}

function ChatBubble({ who, text }) {
  const isAria = who === "aria";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      {isAria ? (
        <div style={{ marginTop: 2 }}><AriaOrb size={22} /></div>
      ) : (
        <div style={{
          width: 22, height: 22, borderRadius: 999,
          background: "var(--sage-soft)", color: "var(--sage)",
          display: "grid", placeItems: "center",
          fontSize: 10, fontWeight: 600, marginTop: 2,
        }}>V</div>
      )}
      <div style={{
        fontSize: 12, lineHeight: 1.5, color: "var(--ink-2)",
        background: isAria ? "var(--bg)" : "transparent",
        padding: isAria ? "8px 10px" : 0,
        borderRadius: 12,
      }}>
        {text}
      </div>
    </div>
  );
}

function CodeBlock() {
  // Syntax-highlighted pseudo-editor (hand-colored tokens)
  const lines = [
    { n: 1, tokens: [{ t: "keyword", v: "function" }, { t: "fn", v: " groupAnagrams" }, { t: "punc", v: "(" }, { t: "param", v: "words" }, { t: "punc", v: ") {" }] },
    { n: 2, tokens: [{ t: "tab", v: "  " }, { t: "keyword", v: "const" }, { t: "var", v: " groups" }, { t: "op", v: " = " }, { t: "keyword", v: "new" }, { t: "type", v: " Map" }, { t: "punc", v: "();" }] },
    { n: 3, tokens: [] },
    { n: 4, tokens: [{ t: "tab", v: "  " }, { t: "keyword", v: "for" }, { t: "punc", v: " (" }, { t: "keyword", v: "const" }, { t: "var", v: " word" }, { t: "keyword", v: " of" }, { t: "var", v: " words" }, { t: "punc", v: ") {" }] },
    { n: 5, tokens: [{ t: "tab", v: "    " }, { t: "comment", v: "// canonical signature: sorted chars" }] },
    { n: 6, tokens: [{ t: "tab", v: "    " }, { t: "keyword", v: "const" }, { t: "var", v: " key" }, { t: "op", v: " = " }, { t: "var", v: "word" }, { t: "punc", v: "." }, { t: "fn", v: "split" }, { t: "punc", v: "(" }, { t: "str", v: "''" }, { t: "punc", v: ")." }, { t: "fn", v: "sort" }, { t: "punc", v: "()." }, { t: "fn", v: "join" }, { t: "punc", v: "(" }, { t: "str", v: "''" }, { t: "punc", v: ");" }] },
    { n: 7, tokens: [] },
    { n: 8, tokens: [{ t: "tab", v: "    " }, { t: "keyword", v: "if" }, { t: "punc", v: " (!" }, { t: "var", v: "groups" }, { t: "punc", v: "." }, { t: "fn", v: "has" }, { t: "punc", v: "(" }, { t: "var", v: "key" }, { t: "punc", v: ")) {" }] },
    { n: 9, tokens: [{ t: "tab", v: "      " }, { t: "var", v: "groups" }, { t: "punc", v: "." }, { t: "fn", v: "set" }, { t: "punc", v: "(" }, { t: "var", v: "key" }, { t: "punc", v: ", []);" }] },
    { n: 10, tokens: [{ t: "tab", v: "    " }, { t: "punc", v: "}" }] },
    { n: 11, tokens: [] },
    { n: 12, tokens: [{ t: "tab", v: "    " }, { t: "var", v: "groups" }, { t: "punc", v: "." }, { t: "fn", v: "get" }, { t: "punc", v: "(" }, { t: "var", v: "key" }, { t: "punc", v: ")." }, { t: "fn", v: "push" }, { t: "punc", v: "(" }, { t: "var", v: "word" }, { t: "punc", v: ");" }] },
    { n: 13, tokens: [{ t: "tab", v: "  " }, { t: "punc", v: "}" }] },
    { n: 14, tokens: [] },
    { n: 15, tokens: [{ t: "tab", v: "  " }, { t: "keyword", v: "return" }, { t: "type", v: " Array" }, { t: "punc", v: "." }, { t: "fn", v: "from" }, { t: "punc", v: "(" }, { t: "var", v: "groups" }, { t: "punc", v: "." }, { t: "fn", v: "values" }, { t: "punc", v: "());" }] },
    { n: 16, tokens: [{ t: "punc", v: "}" }] },
  ];

  const colors = {
    keyword: "#E8A478",
    fn: "#F4D9CE",
    param: "#C8B89E",
    var: "#E8DFD0",
    type: "#A8C7B8",
    punc: "#6B635A",
    op: "#C8B89E",
    str: "#E8C9B4",
    comment: "#6B635A",
    tab: "#6B635A",
  };

  return (
    <div style={{ display: "flex", width: "100%" }} className="rt-code">
      {/* Gutter */}
      <div style={{
        padding: "14px 14px 14px 18px",
        color: "#6B635A",
        fontFamily: "var(--mono)",
        fontSize: 12,
        userSelect: "none",
        borderRight: "1px solid #2A241E",
        background: "#1A1712",
      }}>
        {lines.map(l => (
          <div key={l.n} style={{ lineHeight: "1.7em", textAlign: "right" }}>{l.n}</div>
        ))}
      </div>
      {/* Code */}
      <div style={{
        padding: "14px 18px",
        fontFamily: "var(--mono)",
        fontSize: 13,
        flex: 1,
        overflowX: "auto",
      }}>
        {lines.map(l => (
          <div key={l.n} style={{ lineHeight: "1.7em", whiteSpace: "pre" }}>
            {l.tokens.length === 0 ? "\u00A0" : l.tokens.map((tok, i) => (
              <span key={i} style={{
                color: colors[tok.t] || "#E8DFD0",
                fontStyle: tok.t === "comment" ? "italic" : "normal",
              }}>{tok.v}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { LiveCoding });
