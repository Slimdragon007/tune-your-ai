export interface ParsedResponse {
  reply: string;
  bootFile: string;
}

export function parseResponse(
  raw: string,
  fallbackLabel: string,
  fallbackContent: string
): ParsedResponse {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.reply || !parsed.bootFile) throw new Error("Missing fields");
    return { reply: parsed.reply, bootFile: parsed.bootFile };
  } catch {
    return {
      reply: raw.replace(/```(?:json)?|```/gi, "").trim(),
      bootFile: `${fallbackLabel}\n${fallbackContent}`,
    };
  }
}
