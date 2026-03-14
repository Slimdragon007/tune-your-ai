# AI Tuner — Claude Code Deploy Prompt

Copy everything below this line and paste it as your first message in Claude Code from the project directory.

---

I need to deploy the AI Tuner app as a live web application. This is an AI-powered onboarding tool that walks someone through 7 conversational phases and generates a personalized "boot file" (CLAUDE.md) at the end. It uses the Anthropic API for conversational intelligence and has voice input via the Web Speech API.

## What exists

The working React component is in this project as `ai-tuner.jsx`. It runs as a claude.ai artifact today. I need it converted to a deployable Next.js app on Vercel.

## Architecture

Stack: Next.js 14 (App Router) + Tailwind CSS + Vercel
Pattern: Single-page app with one API route

### Key requirements:

1. **Convert `ai-tuner.jsx` to a Next.js page component**
   - Move it to `src/app/page.tsx` (convert to TypeScript)
   - The component currently calls the Anthropic API directly from the browser. That MUST move to a serverless API route to hide the API key.

2. **Create `/api/tune` serverless route**
   - Accepts POST with: `{ message: string, systemPrompt: string }`
   - Calls Anthropic API (claude-sonnet-4-20250514, max_tokens 1000)
   - Returns the response
   - Uses ANTHROPIC_API_KEY from env vars (never exposed to client)

3. **Update the component to call `/api/tune` instead of the Anthropic API directly**
   - Replace the `fetch("https://api.anthropic.com/v1/messages"...)` call with `fetch("/api/tune"...)`

4. **Fonts**
   - Source Serif 4 (headers, questions) + DM Sans (body, UI)
   - Load via next/font/google

5. **Design tokens (do not change these)**
   - cream: #FAF8F4
   - linen: #F0EAE0
   - brown: #3D2B1F
   - brownMid: #8B7355
   - gold: #C4952E
   - teal: #1D9E75
   - surface: #FFFFFF
   - muted: #A09484
   - error: #C44536

6. **Voice input**
   - Uses Web Speech API (window.SpeechRecognition || window.webkitSpeechRecognition)
   - Continuous mode with interim results
   - Mic button between textarea and send button
   - Red pulsing indicator when recording
   - Must work on iPhone Safari

7. **The 7 phases with system prompts are in the PHASES array at the top of ai-tuner.jsx**
   - Do NOT modify the questions or system prompts
   - Each phase has: id, label, icon, question, systemPrompt

8. **Boot file panel**
   - Toggleable dark panel that shows the boot file building in real time
   - Copy to clipboard button
   - Shows section count in header button

## Deploy

- Push to GitHub repo (create if needed): `ai-tuner` or `tune-your-ai`
- Connect to Vercel for auto-deploy
- Add env var: ANTHROPIC_API_KEY (use printf '%s' to avoid trailing newline)
- Target URL: tune-your-ai.vercel.app (or similar)

## Env vars needed

- ANTHROPIC_API_KEY (for /api/tune route)

## What NOT to do

- Do NOT use Airtable or any database. This is stateless for v1.
- Do NOT add auth. This is open access for testing.
- Do NOT modify the questions, system prompts, or phase order.
- Do NOT use a dark theme. The design is warm cream/brown/gold.
- Do NOT use Inter, Roboto, or any generic font. Source Serif 4 + DM Sans only.

## Verification

After deploy:
1. Open the Vercel URL on desktop. Click "Start tuning." Type an answer. Verify Claude responds.
2. Open on iPhone Safari. Tap the mic button. Speak. Verify transcription appears.
3. Complete all 7 phases. Verify boot file panel shows all sections.
4. Click "Copy to clipboard." Paste somewhere. Verify the full boot file is there.

## Context

This is a FlowstateAI product. The concept: "Your dad tuned cars. You tune AI." The onboarding takes someone from zero AI experience to a personalized AI operating system in 30 minutes. The boot file output is platform-agnostic (works in Claude, Perplexity, GPT, any LLM).

The source artifact file is ai-tuner.jsx in this project directory.
