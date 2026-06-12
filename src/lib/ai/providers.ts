import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import type { ClassificationInput } from "./schema";

/**
 * Provider selection + real provider adapters. These run server-side only and
 * read API keys from non-public env vars. Adapters use fetch (no SDK) and throw
 * on any error so the orchestrator can fall back safely.
 */

export type ProviderName = "mock" | "anthropic" | "openai";

/**
 * Resolve the active provider. Falls back to "mock" when the requested real
 * provider has no API key, so the app always works without a key.
 */
export function resolveProviderName(
  env: Record<string, string | undefined> = process.env,
): ProviderName {
  const p = (env.AI_PROVIDER || "mock").toLowerCase();
  if (p === "anthropic" && env.ANTHROPIC_API_KEY) return "anthropic";
  if (p === "openai" && env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export function defaultModelFor(provider: ProviderName): string | null {
  if (provider === "anthropic") return "claude-haiku-4-5";
  if (provider === "openai") return "gpt-4o-mini";
  return null;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

export async function anthropicClassify(
  input: ClassificationInput,
  opts: { model: string; apiKey: string; signal?: AbortSignal },
): Promise<unknown> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: opts.signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
  const data = await res.json();
  const text: string | undefined = data?.content?.[0]?.text;
  if (!text) throw new Error("Anthropic API: empty response");
  return JSON.parse(extractJsonObject(text));
}

export async function openaiClassify(
  input: ClassificationInput,
  opts: { model: string; apiKey: string; signal?: AbortSignal },
): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: opts.signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI API: empty response");
  return JSON.parse(extractJsonObject(text));
}
