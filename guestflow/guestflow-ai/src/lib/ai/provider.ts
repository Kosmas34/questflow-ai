// Generic AI provider abstraction.
// Works with any OpenAI-compatible chat completions endpoint:
// OpenAI, Groq, Together, Mistral, DeepSeek, local Ollama, etc.
// Configure via env: AI_BASE_URL, AI_API_KEY, AI_MODEL.

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function aiChat(messages: AiMessage[]): Promise<string> {
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("AI_API_KEY is not set");
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3, // low temperature: concierge answers must stay factual
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI provider error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI provider returned an empty response");
  return text.trim();
}
