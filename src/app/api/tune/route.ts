import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server configuration error: ANTHROPIC_API_KEY is not set" },
      { status: 500 }
    );
  }

  const { message, systemPrompt } = await request.json();

  if (!message || !systemPrompt) {
    return NextResponse.json(
      { error: "message and systemPrompt are required" },
      { status: 400 }
    );
  }

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const text =
      response.content?.[0]?.type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text });
  } catch (error: unknown) {
    console.error("Anthropic API error:", error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate response: ${message}` },
      { status: 502 }
    );
  }
}
