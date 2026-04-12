/**
 * AI Provider — Groq (primary) + Gemini 2.5 Flash-Lite (fallback)
 *
 * Все вызовы логируются в таблицу ai_logs.
 * Ключи живут только на сервере (GROQ_API_KEY, GEMINI_API_KEY).
 *
 * ENV vars needed:
 *   GROQ_API_KEY      — from console.groq.com
 *   GEMINI_API_KEY    — from aistudio.google.com
 */

import { db } from "@/lib/db";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCallOptions {
  /** userId для лога (null = системный вызов) */
  userId?: string | null;
  /** Контекст вызова: "analyze-leak", "telegram-leak" */
  callType?: string;
  /** Тип лика если применимо */
  leakType?: string;
}

// ─── Groq ──────────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function callGroq(
  systemPrompt: string,
  userMessage: string
): Promise<{ text: string; latencyMs: number }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const t0 = Date.now();
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned empty response");
  return { text, latencyMs: Date.now() - t0 };
}

// ─── Gemini ────────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.5-flash-lite-preview-06-17";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(
  systemPrompt: string,
  userMessage: string
): Promise<{ text: string; latencyMs: number }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const t0 = Date.now();
  const res = await fetch(`${GEMINI_API_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned empty response");
  return { text, latencyMs: Date.now() - t0 };
}

// ─── Logging ───────────────────────────────────────────────────────────────

const MAX_PROMPT_LEN = 2000;
const MAX_MSG_LEN = 4000;
const MAX_RESPONSE_LEN = 4000;

async function writeLog(params: {
  userId?: string | null;
  callType: string;
  leakType?: string | null;
  provider: "groq" | "gemini";
  model: string;
  systemPrompt: string;
  userMessage: string;
  response: string;
  success: boolean;
  errorMsg?: string | null;
  latencyMs: number;
}): Promise<void> {
  try {
    await db.aiLog.create({
      data: {
        userId: params.userId ?? null,
        callType: params.callType,
        leakType: params.leakType ?? null,
        provider: params.provider,
        model: params.model,
        systemPrompt: params.systemPrompt.slice(0, MAX_PROMPT_LEN),
        userMessage: params.userMessage.slice(0, MAX_MSG_LEN),
        response: params.response.slice(0, MAX_RESPONSE_LEN),
        success: params.success,
        errorMsg: params.errorMsg ?? null,
        latencyMs: params.latencyMs,
      },
    });
  } catch (err) {
    // Логирование не должно ломать основной флоу
    console.error("[AI log] Failed to write ai_log:", (err as Error).message);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface AiCallResult {
  text: string;
  provider: "groq" | "gemini";
  latencyMs: number;
}

/**
 * Calls Groq first; on failure falls back to Gemini.
 * Logs every attempt (success or failure) to ai_logs.
 * Throws only if both providers fail.
 */
export async function callAI(
  systemPrompt: string,
  userMessage: string,
  opts: AiCallOptions = {}
): Promise<AiCallResult> {
  const { userId = null, callType = "unknown", leakType = null } = opts;

  // ── Try Groq first ──────────────────────────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const { text, latencyMs } = await callGroq(systemPrompt, userMessage);
      await writeLog({
        userId,
        callType,
        leakType,
        provider: "groq",
        model: GROQ_MODEL,
        systemPrompt,
        userMessage,
        response: text,
        success: true,
        latencyMs,
      });
      return { text, provider: "groq", latencyMs };
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.warn("[AI] Groq failed, falling back to Gemini:", errorMsg);
      await writeLog({
        userId,
        callType,
        leakType,
        provider: "groq",
        model: GROQ_MODEL,
        systemPrompt,
        userMessage,
        response: "",
        success: false,
        errorMsg,
        latencyMs: 0,
      });
    }
  }

  // ── Fallback: Gemini ────────────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const { text, latencyMs } = await callGemini(systemPrompt, userMessage);
      await writeLog({
        userId,
        callType,
        leakType,
        provider: "gemini",
        model: GEMINI_MODEL,
        systemPrompt,
        userMessage,
        response: text,
        success: true,
        latencyMs,
      });
      return { text, provider: "gemini", latencyMs };
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error("[AI] Gemini also failed:", errorMsg);
      await writeLog({
        userId,
        callType,
        leakType,
        provider: "gemini",
        model: GEMINI_MODEL,
        systemPrompt,
        userMessage,
        response: "",
        success: false,
        errorMsg,
        latencyMs: 0,
      });
      throw new Error("All AI providers failed");
    }
  }

  throw new Error("No AI API keys configured (GROQ_API_KEY / GEMINI_API_KEY)");
}
