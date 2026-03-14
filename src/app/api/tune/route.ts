import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const { message, systemPrompt } = await request.json();

  if (!message || !systemPrompt) {
    return NextResponse.json(
      { error: "message and systemPrompt are required" },
      { status: 400 }
    );
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const text =
      response.content?.[0]?.type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 502 }
    );
  }
}
