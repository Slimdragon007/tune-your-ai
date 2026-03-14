import { describe, it, expect } from "vitest";
import { parseResponse } from "./parseResponse";

describe("parseResponse", () => {
  const fallbackLabel = "IDENTITY";
  const fallbackContent = "I am a designer who loves coffee";

  it("parses clean JSON response", () => {
    const raw = '{"reply": "Great to meet you!", "bootFile": "IDENTITY\\nDesigner, coffee lover"}';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe("Great to meet you!");
    expect(result.bootFile).toBe("IDENTITY\nDesigner, coffee lover");
  });

  it("parses JSON wrapped in ```json backticks", () => {
    const raw = '```json\n{"reply": "Got it!", "bootFile": "IDENTITY\\nCreative type"}\n```';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe("Got it!");
    expect(result.bootFile).toBe("IDENTITY\nCreative type");
  });

  it("parses JSON wrapped in ``` backticks (no language tag)", () => {
    const raw = '```\n{"reply": "Nice!", "bootFile": "VOICE\\nCasual tone"}\n```';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe("Nice!");
    expect(result.bootFile).toBe("VOICE\nCasual tone");
  });

  it("parses JSON with preamble text before the JSON", () => {
    const raw = 'Here is the JSON:\n{"reply": "Understood!", "bootFile": "IDENTITY\\nEngineer"}';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe("Understood!");
    expect(result.bootFile).toBe("IDENTITY\nEngineer");
  });

  it("parses JSON with preamble and backtick wrapping", () => {
    const raw = 'Sure! Here\'s my response:\n```json\n{"reply": "Cool!", "bootFile": "TOOLS\\nSlack (communication)"}\n```';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe("Cool!");
    expect(result.bootFile).toBe("TOOLS\nSlack (communication)");
  });

  it("parses JSON with trailing text after backticks", () => {
    const raw = '```json\n{"reply": "Here we go!", "bootFile": "RULES\\nNever use jargon"}\n```\nLet me know if you need anything else!';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe("Here we go!");
    expect(result.bootFile).toBe("RULES\nNever use jargon");
  });

  it("falls back gracefully when response is plain text (no JSON)", () => {
    const raw = "I understand you're a designer who loves coffee. Tell me more!";
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe(raw);
    expect(result.bootFile).toBe(`${fallbackLabel}\n${fallbackContent}`);
  });

  it("falls back gracefully when response is empty string", () => {
    const result = parseResponse("", fallbackLabel, fallbackContent);
    expect(result.reply).toBe("");
    expect(result.bootFile).toBe(`${fallbackLabel}\n${fallbackContent}`);
  });

  it("falls back when JSON is truncated (max_tokens hit)", () => {
    const raw = '{"reply": "You mentioned several workflows including email triage, calendar management, and project updates. The biggest time sinks seem to be',
    result = parseResponse(raw, fallbackLabel, fallbackContent);
    // Truncated JSON should fail to parse, triggering fallback
    expect(result.bootFile).toBe(`${fallbackLabel}\n${fallbackContent}`);
    expect(result.reply).toBeTruthy();
  });

  it("handles JSON with escaped characters in bootFile", () => {
    const raw = '{"reply": "Got it!", "bootFile": "IDENTITY\\nName: John \\"JD\\" Doe\\nRole: Designer"}';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe("Got it!");
    expect(result.bootFile).toContain("JD");
  });

  it("handles JSON with unicode characters", () => {
    const raw = '{"reply": "Très bien!", "bootFile": "IDENTITY\\nSpeaks French and English"}';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).toBe("Très bien!");
    expect(result.bootFile).toContain("French");
  });

  it("falls back when JSON has reply but no bootFile", () => {
    const raw = '{"reply": "Interesting!"}';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    // Missing bootFile field should trigger fallback
    expect(result.bootFile).toBe(`${fallbackLabel}\n${fallbackContent}`);
  });

  it("falls back when JSON has bootFile but no reply", () => {
    const raw = '{"bootFile": "IDENTITY\\nSome content"}';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.bootFile).toBe(`${fallbackLabel}\n${fallbackContent}`);
  });

  it("handles multiline bootFile content correctly", () => {
    const raw = '{"reply": "Here is your summary.", "bootFile": "WORKFLOWS\\nEmail triage (30 min/day)\\nCalendar management\\nSlack monitoring\\nProject status updates"}';
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.bootFile).toContain("Email triage");
    expect(result.bootFile).toContain("Project status updates");
  });

  it("strips backticks from fallback reply when JSON parsing fails", () => {
    const raw = "```Here is some text that isn't JSON```";
    const result = parseResponse(raw, fallbackLabel, fallbackContent);
    expect(result.reply).not.toContain("```");
  });
});
