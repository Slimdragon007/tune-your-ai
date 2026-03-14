import { useState, useRef, useEffect, useCallback } from "react";

const PHASES = [
  {
    id: "identity",
    label: "Who you are",
    icon: "01",
    question: "Tell me about yourself like you're introducing yourself to a new coworker on your first day. Not your resume, not your LinkedIn. Just... who are you?",
    systemPrompt: `You are an AI onboarding specialist helping someone build their personal AI operating system. The user just answered a question about who they are.

Your job:
1. Play back what you heard in 2-3 sentences to show you understood them
2. Ask ONE follow-up question that digs deeper into their identity, values, or what drives them
3. Extract the boot file content from their answer

Respond in this exact JSON format (no markdown, no backticks):
{"reply": "Your conversational response here. Play back what you heard, then ask one follow-up.", "bootFile": "IDENTITY\\nKey facts extracted from their answer, one per line. Use their language, not corporate speak."}`,
  },
  {
    id: "voice",
    label: "How you talk",
    icon: "02",
    question: "Think about the last message you sent to a friend that felt like YOU. What did it sound like? If your best friend described your communication style in one sentence, what would they say?",
    systemPrompt: `You are an AI onboarding specialist. The user just described their communication style.

Your job:
1. Reflect their style back to them in 2 sentences
2. Ask: "What's a phrase or tone from AI that would make you immediately close the chat?"
3. Extract voice characteristics for the boot file

Respond in this exact JSON format (no markdown, no backticks):
{"reply": "Your response reflecting their style, then ask about their AI dealbreaker.", "bootFile": "VOICE\\nKey voice characteristics, one per line. Direct observations, not assumptions."}`,
  },
  {
    id: "workflows",
    label: "Your time",
    icon: "03",
    question: "Walk me through your typical morning, hour by hour. From when you wake up to lunch. What are you doing, what tools are you touching, and what's annoying about any of it?",
    systemPrompt: `You are an AI onboarding specialist. The user just described their daily routine and workflows.

Your job:
1. Identify the 2-3 biggest time sinks or pain points from their description
2. Ask: "If you had a perfect assistant who knew everything about your work, what would you hand them first?"
3. If they say they've already optimized, pivot to: "What's the thing you WANT to exist that doesn't yet?"
4. Extract workflow data for the boot file

Respond in this exact JSON format (no markdown, no backticks):
{"reply": "Your response identifying their pain points, then your follow-up question.", "bootFile": "WORKFLOWS\\nKey workflows and pain points identified, one per line."}`,
  },
  {
    id: "frustrations",
    label: "AI friction",
    icon: "04",
    question: "Have you tried using ChatGPT, Claude, or any AI tool before? Tell me about a time it really frustrated you. What happened?",
    systemPrompt: `You are an AI onboarding specialist. The user just described their frustrations with AI.

Your job:
1. Validate their frustration in one sentence
2. Turn each frustration into a rule: "So you need AI that [does/doesn't do X]"
3. Ask: "If AI was actually good for you specifically, what would that look like?"
4. Extract rules for the boot file

Respond in this exact JSON format (no markdown, no backticks):
{"reply": "Your response validating and converting frustrations to rules, then your question.", "bootFile": "RULES\\nEach frustration converted to a rule, one per line. Format: Never/Always + specific behavior."}`,
  },
  {
    id: "tools",
    label: "Your tools",
    icon: "05",
    question: "Quick one: what apps are open on your phone right now? And on your laptop? Just rattle them off, don't organize them.",
    systemPrompt: `You are an AI onboarding specialist. The user just listed their tools and apps.

Your job:
1. Organize their tools into categories (communication, data, calendar, specialized) in one sentence
2. Ask: "Which ONE of these tools do you wish was smarter or more connected to everything else?"
3. Extract tool connections for the boot file

Respond in this exact JSON format (no markdown, no backticks):
{"reply": "Your organized summary, then your question about which tool they wish was smarter.", "bootFile": "TOOLS\\nEach tool with its category, one per line. Format: Tool name (category)"}`,
  },
  {
    id: "buddy",
    label: "AI buddy",
    icon: "06",
    question: "Imagine waking up tomorrow and your AI already checked on things for you overnight. What information, if it was just THERE when you opened your phone, would make your whole day better?",
    systemPrompt: `You are an AI onboarding specialist. The user just described what proactive AI support would look like for them.

Your job:
1. Paint back the picture of their ideal morning briefing in 2-3 sentences
2. Ask: "Is there anything you'd want it to remind you about that you tend to forget? Birthdays, follow-ups, deadlines?"
3. Extract proactive layer preferences for the boot file

Respond in this exact JSON format (no markdown, no backticks):
{"reply": "Your response painting their ideal AI morning, then your follow-up.", "bootFile": "PROACTIVE LAYER\\nWhat the AI should surface without being asked, one per line."}`,
  },
  {
    id: "first_task",
    label: "First run",
    icon: "07",
    question: "Last one. What's ONE specific thing happening this week that you wish took less time? Not a big project. Something small and concrete you could finish today if you had help.",
    systemPrompt: `You are an AI onboarding specialist. The user described a task for their first AI-assisted run.

Your job:
1. If they gave a big project, narrow it: "That's a big one. What's the smallest piece of it you could knock out in 10 minutes?"
2. If they gave something small and specific, validate it and explain how their new boot file would help with exactly this
3. Close with: "Your AI is now tuned. Every session from here gets smarter."
4. Extract the first task for the boot file

Respond in this exact JSON format (no markdown, no backticks):
{"reply": "Your response narrowing or validating, then your closing statement.", "bootFile": "FIRST TASK\\nThe specific task they want help with.\\n\\nMISTAKES LOG\\n(empty, will be populated after first use)"}`,
  },
];

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,500;0,8..60,700;1,8..60,400&family=DM+Sans:wght@400;500;600;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  cream: "#FAF8F4",
  linen: "#F0EAE0",
  brown: "#3D2B1F",
  brownLight: "#5C4033",
  brownMid: "#8B7355",
  gold: "#C4952E",
  goldLight: "#E8C97A",
  teal: "#1D9E75",
  surface: "#FFFFFF",
  muted: "#A09484",
  error: "#C44536",
};

export default function AITuner() {
  const [phase, setPhase] = useState(-1);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootSections, setBootSections] = useState([]);
  const [showBoot, setShowBoot] = useState(false);
  const [complete, setComplete] = useState(false);
  const [listening, setListening] = useState(false);
  const chatEnd = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const toggleVoice = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInput((prev) => prev + " [Voice not supported in this browser]");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim = transcript;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    setListening(true);
  }, [listening]);

  const startOnboarding = () => {
    setPhase(0);
    setMessages([
      {
        role: "system",
        text: PHASES[0].question,
        phase: 0,
      },
    ]);
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const currentPhase = phase;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: PHASES[currentPhase].systemPrompt,
          messages: [{ role: "user", content: userMsg }],
        }),
      });

      const data = await response.json();
      const raw = data.content?.[0]?.text || "";

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          reply: raw,
          bootFile: `${PHASES[currentPhase].label.toUpperCase()}\n${userMsg}`,
        };
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: parsed.reply, phase: currentPhase },
      ]);

      if (parsed.bootFile) {
        setBootSections((prev) => [
          ...prev,
          { phase: currentPhase, label: PHASES[currentPhase].label, content: parsed.bootFile },
        ]);
      }

      if (currentPhase < PHASES.length - 1) {
        setTimeout(() => {
          const next = currentPhase + 1;
          setPhase(next);
          setMessages((prev) => [
            ...prev,
            { role: "system", text: PHASES[next].question, phase: next },
          ]);
        }, 2000);
      } else {
        setComplete(true);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Connection hiccup. Your answer was saved. Let me try that again.",
          phase: currentPhase,
        },
      ]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [input, loading, phase]);

  const fullBootFile = bootSections.map((s) => s.content).join("\n\n");

  const copyBoot = () => {
    navigator.clipboard.writeText(fullBootFile);
  };

  // Landing
  if (phase === -1) {
    return (
      <div style={{
        minHeight: "100vh",
        background: C.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          maxWidth: 520,
          textAlign: "center",
        }}>
          <div style={{
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: C.gold,
            fontWeight: 600,
            marginBottom: "1.5rem",
          }}>
            AI OS Onboarding
          </div>
          <h1 style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: C.brown,
            lineHeight: 1.15,
            marginBottom: "1rem",
            letterSpacing: "-0.02em",
          }}>
            Tune your AI.
          </h1>
          <p style={{
            fontSize: "1.1rem",
            color: C.brownMid,
            lineHeight: 1.6,
            marginBottom: "0.75rem",
          }}>
            Same engine, completely different output.
          </p>
          <p style={{
            fontSize: "0.95rem",
            color: C.muted,
            lineHeight: 1.7,
            marginBottom: "2.5rem",
            maxWidth: 400,
            margin: "0 auto 2.5rem",
          }}>
            7 questions. 30 minutes. You'll walk away with a personalized AI system that knows who you are, how you work, and what you need. Type or just talk. No technical skills required.
          </p>
          <button
            onClick={startOnboarding}
            style={{
              background: C.brown,
              color: C.cream,
              border: "none",
              padding: "1rem 2.5rem",
              borderRadius: "2rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.25s",
              boxShadow: `0 4px 24px ${C.brown}22`,
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = `0 8px 32px ${C.brown}33`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = `0 4px 24px ${C.brown}22`;
            }}
          >
            Start tuning
          </button>
          <div style={{
            marginTop: "3rem",
            display: "flex",
            justifyContent: "center",
            gap: "2rem",
            flexWrap: "wrap",
          }}>
            {["Identity", "Voice", "Workflows", "Rules", "Tools", "AI Buddy", "First Run"].map(
              (label, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: C.muted,
                    fontWeight: 500,
                  }}
                >
                  {String(i + 1).padStart(2, "0")} {label}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.linen}`,
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: C.brown,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.gold,
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            AI
          </div>
          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: C.brown }}>
            AI Tuner
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {PHASES.map((p, i) => (
            <div
              key={i}
              style={{
                width: i <= phase ? 24 : 8,
                height: 4,
                borderRadius: 2,
                background: i < phase ? C.teal : i === phase ? C.gold : C.linen,
                transition: "all 0.4s ease",
              }}
            />
          ))}
          <span
            style={{
              fontSize: "0.7rem",
              color: C.muted,
              marginLeft: "0.5rem",
              fontWeight: 500,
            }}
          >
            {phase + 1}/7
          </span>
        </div>
        {bootSections.length > 0 && (
          <button
            onClick={() => setShowBoot(!showBoot)}
            style={{
              background: showBoot ? C.brown : "transparent",
              color: showBoot ? C.cream : C.brownMid,
              border: `1px solid ${showBoot ? C.brown : C.linen}`,
              padding: "0.4rem 0.9rem",
              borderRadius: "1rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s",
            }}
          >
            Boot file ({bootSections.length})
          </button>
        )}
      </div>

      {/* Boot file panel */}
      {showBoot && (
        <div
          style={{
            background: C.brown,
            color: C.cream,
            padding: "1.25rem",
            maxHeight: "40vh",
            overflowY: "auto",
            borderBottom: `2px solid ${C.gold}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.gold,
                fontWeight: 600,
              }}
            >
              Your boot file (building live)
            </span>
            <button
              onClick={copyBoot}
              style={{
                background: C.gold,
                color: C.brown,
                border: "none",
                padding: "0.3rem 0.8rem",
                borderRadius: "1rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Copy
            </button>
          </div>
          <pre
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.8rem",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              color: "#E8E0D4",
              margin: 0,
            }}
          >
            {fullBootFile || "Answers will populate here as you go..."}
          </pre>
        </div>
      )}

      {/* Chat area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem 1.25rem",
          maxWidth: 640,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: "1.25rem",
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "fadeIn 0.4s ease",
            }}
          >
            {msg.role === "system" && (
              <div
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.gold,
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                {PHASES[msg.phase]?.icon} {PHASES[msg.phase]?.label}
              </div>
            )}
            <div
              style={{
                maxWidth: msg.role === "user" ? "85%" : "90%",
                padding: msg.role === "system" ? "0" : "0.9rem 1.1rem",
                borderRadius:
                  msg.role === "user"
                    ? "1rem 1rem 0.25rem 1rem"
                    : "1rem 1rem 1rem 0.25rem",
                background:
                  msg.role === "user"
                    ? C.brown
                    : msg.role === "system"
                    ? "transparent"
                    : C.surface,
                color:
                  msg.role === "user"
                    ? C.cream
                    : C.brown,
                fontSize:
                  msg.role === "system" ? "1.15rem" : "0.9rem",
                lineHeight: 1.7,
                fontFamily:
                  msg.role === "system"
                    ? "'Source Serif 4', serif"
                    : "'DM Sans', sans-serif",
                fontWeight: msg.role === "system" ? 400 : 400,
                border:
                  msg.role === "assistant"
                    ? `1px solid ${C.linen}`
                    : "none",
                fontStyle: msg.role === "system" ? "italic" : "normal",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div
            style={{
              display: "flex",
              gap: "0.35rem",
              padding: "0.75rem 0",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.muted,
                  animation: `pulse 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {complete && (
          <div
            style={{
              textAlign: "center",
              padding: "2rem 0",
              animation: "fadeIn 0.6s ease",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: C.teal,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                color: "#fff",
                fontSize: "1.2rem",
              }}
            >
              ✓
            </div>
            <h2
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: "1.5rem",
                color: C.brown,
                marginBottom: "0.5rem",
              }}
            >
              Your AI is tuned.
            </h2>
            <p
              style={{
                color: C.brownMid,
                fontSize: "0.9rem",
                lineHeight: 1.6,
                maxWidth: 400,
                margin: "0 auto 1.5rem",
              }}
            >
              Your boot file is ready. Copy it and paste it as your first message in any Claude, ChatGPT, or Perplexity session. Every conversation from here starts with context.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowBoot(true)}
                style={{
                  background: C.brown,
                  color: C.cream,
                  border: "none",
                  padding: "0.8rem 2rem",
                  borderRadius: "2rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                View boot file
              </button>
              <button
                onClick={copyBoot}
                style={{
                  background: "transparent",
                  color: C.brown,
                  border: `1.5px solid ${C.brown}`,
                  padding: "0.8rem 2rem",
                  borderRadius: "2rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Copy to clipboard
              </button>
            </div>
          </div>
        )}

        <div ref={chatEnd} />
      </div>

      {/* Input area */}
      {!complete && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: C.cream,
            borderTop: `1px solid ${C.linen}`,
            padding: "1rem 1.25rem",
          }}
        >
          {listening && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              maxWidth: 640,
              margin: "0 auto 0.5rem",
              padding: "0.4rem 0.75rem",
              background: `${C.error}11`,
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              color: C.error,
              fontWeight: 500,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: C.error,
                animation: "pulse 1s ease-in-out infinite",
              }} />
              Recording... tap mic to stop, then send
            </div>
          )}
          <div
            style={{
              maxWidth: 640,
              margin: "0 auto",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={listening ? "Listening... tap the mic to stop" : "Type or tap the mic to talk..."}
              rows={2}
              style={{
                flex: 1,
                padding: "0.8rem 1rem",
                borderRadius: "0.75rem",
                border: `1.5px solid ${C.linen}`,
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                resize: "none",
                outline: "none",
                background: C.surface,
                color: C.brown,
                lineHeight: 1.5,
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.gold)}
              onBlur={(e) => (e.target.style.borderColor = C.linen)}
            />
            <button
              onClick={toggleVoice}
              style={{
                background: listening ? C.error : "transparent",
                color: listening ? C.cream : C.brownMid,
                border: listening ? "none" : `1.5px solid ${C.linen}`,
                width: 44,
                height: 44,
                borderRadius: "50%",
                fontSize: "1.1rem",
                cursor: "pointer",
                transition: "all 0.25s",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: listening ? "micPulse 1.5s ease-in-out infinite" : "none",
              }}
              title={listening ? "Stop recording" : "Start voice input"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button
              onClick={() => { if (listening && recognitionRef.current) { recognitionRef.current.stop(); setListening(false); } sendMessage(); }}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? C.brown : C.linen,
                color: input.trim() && !loading ? C.cream : C.muted,
                border: "none",
                width: 44,
                height: 44,
                borderRadius: "50%",
                fontSize: "1.1rem",
                cursor: input.trim() && !loading ? "pointer" : "default",
                transition: "all 0.2s",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes micPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(196, 69, 54, 0.4); } 50% { box-shadow: 0 0 0 10px rgba(196, 69, 54, 0); } }
        textarea::placeholder { color: ${C.muted}; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
