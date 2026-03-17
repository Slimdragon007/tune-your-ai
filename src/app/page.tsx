"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseResponse } from "@/lib/parseResponse";

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

interface ChatMessage {
  role: "system" | "user" | "assistant";
  text: string;
  phase?: number;
}

interface BootSection {
  phase: number;
  label: string;
  content: string;
}

interface ApiMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AITuner() {
  const [phase, setPhase] = useState(-1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootSections, setBootSections] = useState<BootSection[]>([]);
  const [showBoot, setShowBoot] = useState(false);
  const [complete, setComplete] = useState(false);
  const [listening, setListening] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [phaseMessages, setPhaseMessages] = useState<ApiMessage[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load saved boot file on mount
  useEffect(() => {
    const saved = localStorage.getItem("ai-tuner-boot");
    if (saved) {
      try {
        const sections: BootSection[] = JSON.parse(saved);
        if (sections.length > 0) {
          setBootSections(sections);
          setPhase(sections.length - 1);
          setComplete(sections.length >= PHASES.length);
        }
      } catch {
        // ignore corrupted data
      }
    }
  }, []);

  // Save boot file whenever it updates
  useEffect(() => {
    if (bootSections.length > 0) {
      localStorage.setItem("ai-tuner-boot", JSON.stringify(bootSections));
    }
  }, [bootSections]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, showContinue]);

  const toggleVoice = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      setInput((prev) => prev + " [Voice not supported in this browser]");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

    recognition.onerror = () => {
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

  const advancePhase = useCallback(() => {
    setShowContinue(false);
    setPhaseMessages([]);

    const next = phase + 1;
    if (next >= PHASES.length) {
      setComplete(true);
      return;
    }

    // Brief breathing room before the next phase appears
    setTimeout(() => {
      setPhase(next);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: PHASES[next].question,
          phase: next,
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 800);
  }, [phase]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setShowContinue(false);

    const currentPhase = phase;
    const isFollowUp = phaseMessages.length > 0;

    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    // Build conversation history for multi-turn within a phase
    const apiMessages: ApiMessage[] = [
      ...phaseMessages,
      { role: "user", content: userMsg },
    ];

    const systemPrompt = isFollowUp
      ? `${PHASES[currentPhase].systemPrompt}

IMPORTANT: This is a follow-up in the same conversation phase. The user is responding to your previous message. Continue naturally — acknowledge what they shared, go deeper if there's more to explore, and extract any new information into the bootFile. Keep it warm and conversational. Don't repeat questions they've already answered.`
      : PHASES[currentPhase].systemPrompt;

    try {
      const response = await fetch("/api/tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      const raw = data.text || "";

      const parsed = parseResponse(
        raw,
        PHASES[currentPhase].label.toUpperCase(),
        userMsg
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: parsed.reply, phase: currentPhase },
      ]);

      // Update conversation history for this phase
      setPhaseMessages((prev) => [
        ...prev,
        { role: "user", content: userMsg },
        { role: "assistant", content: raw },
      ]);

      if (parsed.bootFile) {
        if (isFollowUp) {
          // Append to existing boot section for this phase
          setBootSections((prev) => {
            const updated = [...prev];
            const existing = updated.findIndex(
              (s) => s.phase === currentPhase
            );
            if (existing >= 0) {
              updated[existing] = {
                ...updated[existing],
                content: updated[existing].content + "\n" + parsed.bootFile,
              };
            } else {
              updated.push({
                phase: currentPhase,
                label: PHASES[currentPhase].label,
                content: parsed.bootFile,
              });
            }
            return updated;
          });
        } else {
          setBootSections((prev) => [
            ...prev,
            {
              phase: currentPhase,
              label: PHASES[currentPhase].label,
              content: parsed.bootFile,
            },
          ]);
        }
      }

      // Show the "next" option after a gentle pause — let the user read first
      if (currentPhase < PHASES.length - 1) {
        setTimeout(() => setShowContinue(true), 3500);
      } else {
        setTimeout(() => setComplete(true), 1500);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `${errorMessage} Please try sending your answer again.`,
          phase: currentPhase,
        },
      ]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [input, loading, phase, phaseMessages]);

  const fullBootFile = bootSections.map((s) => s.content).join("\n\n");

  const [copied, setCopied] = useState(false);

  const copyBoot = () => {
    navigator.clipboard.writeText(fullBootFile);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBoot = () => {
    const blob = new Blob([fullBootFile], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-ai-boot-file.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const startFresh = () => {
    localStorage.removeItem("ai-tuner-boot");
    setBootSections([]);
    setMessages([]);
    setPhase(-1);
    setComplete(false);
    setShowBoot(false);
    setShowContinue(false);
    setPhaseMessages([]);
  };

  // Dynamic placeholder based on conversation state
  const getPlaceholder = () => {
    if (listening) return "Listening... tap the mic to stop";
    if (showContinue) return "Keep talking, or move on when you're ready...";
    return "Type or tap the mic to talk...";
  };

  const submitFeedback = () => {
    if (!feedbackText.trim()) return;
    const feedbackLog = JSON.parse(
      localStorage.getItem("ai-tuner-feedback") || "[]"
    );
    feedbackLog.push({
      text: feedbackText.trim(),
      phase,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("ai-tuner-feedback", JSON.stringify(feedbackLog));
    setFeedbackText("");
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setShowFeedback(false);
    }, 2000);
  };

  // Returning user with saved boot file
  if (phase !== -1 && complete && messages.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.cream,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "var(--font-dm-sans), sans-serif",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.teal,
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            Welcome back
          </div>
          <h1
            style={{
              fontFamily: "var(--font-source-serif), serif",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 700,
              color: C.brown,
              lineHeight: 1.15,
              marginBottom: "1rem",
              letterSpacing: "-0.02em",
            }}
          >
            Your AI is already tuned.
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: C.brownMid,
              lineHeight: 1.6,
              marginBottom: "2rem",
              maxWidth: 400,
              margin: "0 auto 2rem",
            }}
          >
            Your boot file is saved from last time. Copy it and paste it into
            your AI&apos;s context area.
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "2rem",
            }}
          >
            <button
              onClick={copyBoot}
              style={{
                background: C.brown,
                color: C.cream,
                border: "none",
                padding: "1rem 2.5rem",
                borderRadius: "2rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              {copied ? "Copied!" : "Copy boot file"}
            </button>
            <button
              onClick={downloadBoot}
              style={{
                background: "transparent",
                color: C.brown,
                border: `1.5px solid ${C.brown}`,
                padding: "1rem 2.5rem",
                borderRadius: "2rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              Download .txt
            </button>
          </div>
          <button
            onClick={startFresh}
            style={{
              background: "transparent",
              color: C.muted,
              border: "none",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            Start over with new answers
          </button>
        </div>
      </div>
    );
  }

  // Landing
  if (phase === -1) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.cream,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "var(--font-dm-sans), sans-serif",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.gold,
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            AI OS Onboarding
          </div>
          <h1
            style={{
              fontFamily: "var(--font-source-serif), serif",
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              color: C.brown,
              lineHeight: 1.15,
              marginBottom: "1rem",
              letterSpacing: "-0.02em",
            }}
          >
            Tune your AI.
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: C.brownMid,
              lineHeight: 1.6,
              marginBottom: "0.75rem",
            }}
          >
            Same engine, completely different output.
          </p>
          <p
            style={{
              fontSize: "0.95rem",
              color: C.muted,
              lineHeight: 1.7,
              marginBottom: "2.5rem",
              maxWidth: 400,
              margin: "0 auto 2.5rem",
            }}
          >
            7 questions. 30 minutes. You&apos;ll walk away with a personalized AI
            system that knows who you are, how you work, and what you need. Type
            or just talk. No technical skills required.
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
              fontFamily: "var(--font-dm-sans), sans-serif",
              transition: "all 0.25s",
              boxShadow: `0 4px 24px ${C.brown}22`,
            }}
            onMouseEnter={(e) => {
              const t = e.target as HTMLButtonElement;
              t.style.transform = "translateY(-2px)";
              t.style.boxShadow = `0 8px 32px ${C.brown}33`;
            }}
            onMouseLeave={(e) => {
              const t = e.target as HTMLButtonElement;
              t.style.transform = "translateY(0)";
              t.style.boxShadow = `0 4px 24px ${C.brown}22`;
            }}
          >
            Start tuning
          </button>
          <div
            style={{
              marginTop: "3rem",
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              flexWrap: "wrap",
            }}
          >
            {[
              "Identity",
              "Voice",
              "Workflows",
              "Rules",
              "Tools",
              "AI Buddy",
              "First Run",
            ].map((label, i) => (
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
            ))}
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
        fontFamily: "var(--font-dm-sans), sans-serif",
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
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
        >
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
          <span
            style={{ fontSize: "0.9rem", fontWeight: 600, color: C.brown }}
          >
            AI Tuner
          </span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {PHASES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i <= phase ? 24 : 8,
                height: 4,
                borderRadius: 2,
                background:
                  i < phase ? C.teal : i === phase ? C.gold : C.linen,
                transition: "all 0.6s ease",
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
              fontFamily: "var(--font-dm-sans), sans-serif",
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
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              Copy
            </button>
          </div>
          <pre
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
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
          <div key={i}>
            {/* Phase divider between phases */}
            {msg.role === "system" && msg.phase! > 0 && (
              <div
                className="animate-fade-in"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  margin: "1.5rem 0",
                }}
              >
                <div style={{ flex: 1, height: 1, background: C.linen }} />
                <div
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: C.brownMid,
                    fontWeight: 600,
                    background: C.cream,
                    padding: "0.3rem 0.9rem",
                    borderRadius: "1rem",
                    border: `1px solid ${C.linen}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  Phase {msg.phase! + 1} of {PHASES.length} &middot; {PHASES[msg.phase!]?.label}
                </div>
                <div style={{ flex: 1, height: 1, background: C.linen }} />
              </div>
            )}
            <div
              className="animate-fade-in"
              style={{
                marginBottom: "1.25rem",
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
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
                  {PHASES[msg.phase!]?.icon} {PHASES[msg.phase!]?.label}
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
                  color: msg.role === "user" ? C.cream : C.brown,
                  fontSize: msg.role === "system" ? "1.15rem" : "0.9rem",
                  lineHeight: 1.7,
                  fontFamily:
                    msg.role === "system"
                      ? "var(--font-source-serif), serif"
                      : "var(--font-dm-sans), sans-serif",
                  fontWeight: 400,
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
                className="animate-pulse-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.muted,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Gentle "next question" prompt */}
        {showContinue && !loading && !complete && (
          <div
            className="animate-fade-in-slow"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1.5rem 0 0.5rem",
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(to right, transparent, ${C.linen})`,
              }}
            />
            <button
              onClick={advancePhase}
              style={{
                background: "none",
                border: `1px solid ${C.linen}`,
                color: C.brownMid,
                padding: "0.5rem 1.5rem",
                borderRadius: "2rem",
                fontSize: "0.8rem",
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                const t = e.target as HTMLButtonElement;
                t.style.borderColor = C.gold;
                t.style.color = C.brown;
              }}
              onMouseLeave={(e) => {
                const t = e.target as HTMLButtonElement;
                t.style.borderColor = C.linen;
                t.style.color = C.brownMid;
              }}
            >
              next question &rarr;
            </button>
            <div
              style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(to left, transparent, ${C.linen})`,
              }}
            />
          </div>
        )}

        {complete && (
          <div
            className="animate-fade-in"
            style={{
              textAlign: "center",
              padding: "2rem 0",
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
              &#10003;
            </div>
            <h2
              style={{
                fontFamily: "var(--font-source-serif), serif",
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
                maxWidth: 440,
                margin: "0 auto 1.5rem",
              }}
            >
              Your boot file is saved and ready. Now paste it into your AI&apos;s
              context area so every conversation starts with who you are.
            </p>

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: "2rem",
              }}
            >
              <button
                onClick={copyBoot}
                style={{
                  background: C.brown,
                  color: C.cream,
                  border: "none",
                  padding: "0.8rem 2rem",
                  borderRadius: "2rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
              <button
                onClick={downloadBoot}
                style={{
                  background: "transparent",
                  color: C.brown,
                  border: `1.5px solid ${C.brown}`,
                  padding: "0.8rem 2rem",
                  borderRadius: "2rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                Download .txt
              </button>
              <button
                onClick={() => setShowBoot(true)}
                style={{
                  background: "transparent",
                  color: C.brownMid,
                  border: `1.5px solid ${C.linen}`,
                  padding: "0.8rem 2rem",
                  borderRadius: "2rem",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                View boot file
              </button>
            </div>

            {/* Where to paste it */}
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.linen}`,
                borderRadius: "1rem",
                padding: "1.5rem",
                maxWidth: 440,
                margin: "0 auto 1.5rem",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.gold,
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                Where to paste your boot file
              </div>
              {[
                {
                  name: "Claude",
                  step: "Settings \u2192 Projects \u2192 New Project \u2192 paste in Project Instructions",
                },
                {
                  name: "ChatGPT",
                  step: "Settings \u2192 Personalization \u2192 Custom Instructions \u2192 paste in \"What would you like ChatGPT to know about you?\"",
                },
                {
                  name: "Perplexity",
                  step: "Settings \u2192 Profile \u2192 AI Profile \u2192 paste in the bio field",
                },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    marginBottom: "0.75rem",
                    fontSize: "0.85rem",
                    lineHeight: 1.6,
                    color: C.brown,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.name}:</span>{" "}
                  <span style={{ color: C.brownMid }}>{item.step}</span>
                </div>
              ))}
              <p
                style={{
                  fontSize: "0.8rem",
                  color: C.muted,
                  marginTop: "0.75rem",
                  marginBottom: 0,
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                Your boot file is auto-saved. Come back anytime to copy it again.
              </p>
            </div>

            {/* Start fresh */}
            <button
              onClick={startFresh}
              style={{
                background: "transparent",
                color: C.muted,
                border: "none",
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              Start over with new answers
            </button>
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
            <div
              style={{
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
              }}
            >
              <div
                className="animate-pulse-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: C.error,
                }}
              />
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
              placeholder={getPlaceholder()}
              rows={2}
              style={{
                flex: 1,
                padding: "0.8rem 1rem",
                borderRadius: "0.75rem",
                border: `1.5px solid ${C.linen}`,
                fontSize: "0.9rem",
                fontFamily: "var(--font-dm-sans), sans-serif",
                resize: "none",
                outline: "none",
                background: C.surface,
                color: C.brown,
                lineHeight: 1.5,
                transition: "border-color 0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = C.gold)
              }
              onBlur={(e) =>
                (e.target.style.borderColor = C.linen)
              }
            />
            <button
              onClick={toggleVoice}
              className={listening ? "animate-mic-pulse" : ""}
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
              }}
              title={listening ? "Stop recording" : "Start voice input"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (listening && recognitionRef.current) {
                  recognitionRef.current.stop();
                  setListening(false);
                }
                sendMessage();
              }}
              disabled={!input.trim() || loading}
              style={{
                background:
                  input.trim() && !loading ? C.brown : C.linen,
                color:
                  input.trim() && !loading ? C.cream : C.muted,
                border: "none",
                width: 44,
                height: 44,
                borderRadius: "50%",
                fontSize: "1.1rem",
                cursor:
                  input.trim() && !loading ? "pointer" : "default",
                transition: "all 0.2s",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              &#8593;
            </button>
          </div>
        </div>
      )}

      {/* Feedback button */}
      <button
        onClick={() => setShowFeedback(true)}
        style={{
          position: "fixed",
          bottom: phase === -1 || complete ? "1.5rem" : "6rem",
          right: "1.5rem",
          background: C.surface,
          color: C.brownMid,
          border: `1px solid ${C.linen}`,
          width: 40,
          height: 40,
          borderRadius: "50%",
          fontSize: "1rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          zIndex: 20,
          transition: "all 0.2s",
        }}
        title="Send feedback or report a bug"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Feedback modal */}
      {showFeedback && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            padding: "1rem",
          }}
          onClick={() => setShowFeedback(false)}
        >
          <div
            className="animate-fade-in"
            style={{
              background: C.surface,
              borderRadius: "1rem",
              padding: "1.5rem",
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: "var(--font-source-serif), serif",
                fontSize: "1.1rem",
                color: C.brown,
                marginBottom: "0.25rem",
              }}
            >
              Feedback or bug report
            </h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: C.muted,
                marginBottom: "1rem",
                lineHeight: 1.5,
              }}
            >
              Let us know what happened or how we can improve.
            </p>
            {feedbackSent ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "1rem 0",
                  color: C.teal,
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Thanks for your feedback!
              </div>
            ) : (
              <>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Describe the issue or share your thoughts..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `1.5px solid ${C.linen}`,
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    resize: "vertical",
                    outline: "none",
                    color: C.brown,
                    marginBottom: "0.75rem",
                  }}
                />
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowFeedback(false)}
                    style={{
                      background: "transparent",
                      color: C.muted,
                      border: "none",
                      padding: "0.5rem 1rem",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim()}
                    style={{
                      background: feedbackText.trim() ? C.brown : C.linen,
                      color: feedbackText.trim() ? C.cream : C.muted,
                      border: "none",
                      padding: "0.5rem 1.25rem",
                      borderRadius: "1.5rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: feedbackText.trim() ? "pointer" : "default",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                    }}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
