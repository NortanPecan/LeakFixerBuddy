/**
 * AI Provider — Groq (primary) + Gemini 2.5 Flash-Lite (fallback)
 *
 * ENV vars needed:
 *   GROQ_API_KEY      — from console.groq.com
 *   GEMINI_API_KEY    — from aistudio.google.com
 */

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ─── Groq ──────────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'llama-3.3-70b-versatile'

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not set')

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Groq API error ${res.status}: ${err}`)
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Groq returned empty response')
  return text
}

// ─── Gemini ────────────────────────────────────────────────────────────────

const GEMINI_MODEL   = 'gemini-2.5-flash-lite-preview-06-17'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')

  const res = await fetch(`${GEMINI_API_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = (await res.json()) as {
    candidates: { content: { parts: { text: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini returned empty response')
  return text
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface AiCallResult {
  text: string
  provider: 'groq' | 'gemini'
}

/**
 * Calls Groq first; on failure falls back to Gemini.
 * Throws only if both providers fail.
 */
export async function callAI(
  systemPrompt: string,
  userMessage: string
): Promise<AiCallResult> {
  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const text = await callGroq(systemPrompt, userMessage)
      return { text, provider: 'groq' }
    } catch (err) {
      console.warn('[AI] Groq failed, falling back to Gemini:', (err as Error).message)
    }
  }

  // Fallback: Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await callGemini(systemPrompt, userMessage)
      return { text, provider: 'gemini' }
    } catch (err) {
      console.error('[AI] Gemini also failed:', (err as Error).message)
      throw new Error('All AI providers failed')
    }
  }

  throw new Error('No AI API keys configured (GROQ_API_KEY / GEMINI_API_KEY)')
}
