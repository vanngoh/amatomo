/**
 * All LLM access lives here. GMI Cloud exposes an OpenAI-compatible
 * Chat Completions endpoint: POST {GMI_BASE_URL}/chat/completions.
 */
import * as logger from "firebase-functions/logger";

export function gmiConfig() {
  const apiKey = (process.env.GMI_API_KEY || "").trim();
  return {
    apiKey,
    baseUrl: (process.env.GMI_BASE_URL || "https://api.gmi-serving.com/v1")
      .trim()
      .replace(/\/+$/, ""),
    model: (process.env.GMI_MODEL || "deepseek-ai/DeepSeek-V4.1-Flash").trim(),
    // Thinking models spend max_tokens on hidden reasoning and return empty
    // content. "none" turns that off; set GMI_REASONING_EFFORT= (empty) to
    // omit the parameter for models that reject it.
    reasoningEffort: (process.env.GMI_REASONING_EFFORT ?? "none").trim(),
  };
}

/** Mock mode when no key is set, or the key is an obvious placeholder. */
export function isMockMode(): boolean {
  const key = gmiConfig().apiKey;
  return !key || /^(placeholder|changeme|your|xxx|todo|dummy)/i.test(key);
}

/** Remove ``` fences and pull out the first {...} block. */
export function extractJson(text: string): unknown {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

async function callOnce(
  system: string,
  user: string,
  maxTokens: number
): Promise<string> {
  const {apiKey, baseUrl, model, reasoningEffort} = gmiConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
        ...(reasoningEffort ? {reasoning_effort: reasoningEffort} : {}),
        messages: [
          {role: "system", content: system},
          {role: "user", content: user},
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: {message?: {content?: string}}[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned no content");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask for JSON, parse and validate it. Retries once on any failure.
 * `validate` returns the typed value or throws.
 */
export async function chatJson<T>(
  system: string,
  user: string,
  validate: (v: unknown) => T,
  maxTokens = 600
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callOnce(system, user, maxTokens);
      return validate(extractJson(raw));
    } catch (err) {
      lastErr = err;
      logger.warn(`LLM attempt ${attempt + 1} failed`, {
        error: String(err),
      });
    }
  }
  throw lastErr;
}
