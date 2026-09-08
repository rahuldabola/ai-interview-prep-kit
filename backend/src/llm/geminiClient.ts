import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ZodType } from "zod";
import { env } from "../config/env.js";
import { LLM } from "../config/constants.js";

export class LLMGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LLMGenerationError";
  }
}

let client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (!env.GEMINI_API_KEY) {
    throw new LLMGenerationError("GEMINI_API_KEY is not set");
  }
  if (!client) client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return client;
}

/**
 * Simple counting semaphore bounding LLM requests-in-flight to LLM_MAX_CONCURRENCY, so a
 * single kit generation (or a batch run of several kits) doesn't blow through the free
 * tier's tokens-per-minute limit just by firing every call at once.
 */
class Semaphore {
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(private readonly max: number) {}

  async acquire(): Promise<() => void> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    return () => {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    };
  }
}

const semaphore = new Semaphore(env.LLM_MAX_CONCURRENCY);

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = String((err as Error)?.message ?? "");
  return status === 429 || status === 503 || /RESOURCE_EXHAUSTED|rate.?limit|overloaded|503/i.test(message);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]!.trim() : trimmed;
  return JSON.parse(candidate);
}

export interface GenerateJsonOptions<T> {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Issues one Gemini call in JSON mode, validates the result against `schema`, and — if the
 * model returned invalid JSON or an off-schema shape — retries with a repair prompt that
 * shows the model its own broken output and the validation error, sharing the same
 * LLM.MAX_RETRIES attempt budget as rate-limit/5xx retries (which additionally back off
 * exponentially with jitter before retrying). This is the single choke point
 * every pipeline stage calls through, which is what keeps a "provider says slow down" event
 * from taking down the whole run (Section: Preferred Tech Stack warning; Section 10:
 * "your LLM provider rate-limits you, or briefly fails").
 */
export async function generateJson<T>(options: GenerateJsonOptions<T>): Promise<T> {
  const { system, prompt, schema, maxOutputTokens = 4096, temperature = 0.4 } = options;
  const model = getClient().getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens,
      temperature,
    },
  });

  let lastError: unknown;
  let repairContext: string | null = null;

  for (let attempt = 0; attempt <= LLM.MAX_RETRIES; attempt++) {
    const release = await semaphore.acquire();
    try {
      const finalPrompt = repairContext ? `${prompt}\n\n${repairContext}` : prompt;
      const result = await model.generateContent(finalPrompt);
      const text = result.response.text();

      let parsed: unknown;
      try {
        parsed = extractJson(text);
      } catch (parseErr) {
        repairContext = [
          "Your previous response was not valid JSON. Here is what you returned:",
          "```",
          text.slice(0, 2000),
          "```",
          "Return ONLY valid JSON matching the requested shape, no prose, no markdown fences.",
        ].join("\n");
        lastError = parseErr;
        continue;
      }

      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        repairContext = [
          "Your previous JSON did not match the required shape. Validation errors:",
          JSON.stringify(validated.error.issues.slice(0, 10), null, 2),
          "Return ONLY corrected JSON matching the requested shape.",
        ].join("\n");
        lastError = validated.error;
        continue;
      }

      return validated.data;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === LLM.MAX_RETRIES) {
        break;
      }
      const backoff = Math.min(LLM.BASE_BACKOFF_MS * 2 ** attempt, LLM.MAX_BACKOFF_MS);
      const jitter = Math.random() * backoff * 0.3;
      await sleep(backoff + jitter);
    } finally {
      release();
    }
  }

  throw new LLMGenerationError(
    `LLM call failed after retries: ${(lastError as Error)?.message ?? String(lastError)}`,
    lastError
  );
}
