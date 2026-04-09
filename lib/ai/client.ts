import 'server-only';

import { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// AGENT_TASK_601: Gemini AI Client (Updated for @google/genai SDK + Gemini 3)
//
// Singleton wrapper around the new Google GenAI SDK with:
//   - Rate limiting (token-bucket style, 10 requests / minute)
//   - Timeout control (15s default)
//   - Structured error handling
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('[AI] GEMINI_API_KEY is not set — AI features will be disabled.');
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// ---------------------------------------------------------------------------
// Rate limiter — simple token bucket (10 requests per 60s window)
// ---------------------------------------------------------------------------

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

let tokenBucket = RATE_LIMIT;
let lastRefill = Date.now();

function consumeRateToken(): boolean {
  const now = Date.now();
  const elapsed = now - lastRefill;

  // Refill tokens proportionally
  if (elapsed >= RATE_WINDOW_MS) {
    tokenBucket = RATE_LIMIT;
    lastRefill = now;
  } else {
    const refill = Math.floor((elapsed / RATE_WINDOW_MS) * RATE_LIMIT);
    if (refill > 0) {
      tokenBucket = Math.min(RATE_LIMIT, tokenBucket + refill);
      lastRefill = now;
    }
  }

  if (tokenBucket <= 0) return false;
  tokenBucket--;
  return true;
}

// ---------------------------------------------------------------------------
// Core generation function
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  /** System instruction to guide the model */
  systemInstruction?: string;
  /** User prompt */
  prompt: string;
  /** Optional base64 images to process */
  imageParts?: Array<{ inlineData: { data: string; mimeType: string } }>;
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Model to use (default: gemini-2.5-flash) */
  model?: string;
  /** Temperature for generation (default: 1.0 — recommended for Gemini 3) */
  temperature?: number;
  /** Max output tokens */
  maxOutputTokens?: number;
  /** Response mimetype (e.g. application/json) */
  responseMimeType?: string;
}

export interface GenerateResult {
  text: string;
  success: true;
}

export interface GenerateError {
  success: false;
  error: string;
  code: 'NO_API_KEY' | 'RATE_LIMITED' | 'TIMEOUT' | 'GENERATION_ERROR' | 'BLOCKED';
}

export type GenerateResponse = GenerateResult | GenerateError;

/**
 * Generate text using Google Gemini via the new @google/genai SDK.
 * Includes built-in rate limiting, timeout control, and structured error handling.
 */
export async function generate(options: GenerateOptions): Promise<GenerateResponse> {
  const {
    systemInstruction,
    prompt,
    imageParts,
    timeoutMs = 15_000,
    model: modelName = 'gemini-2.5-flash',
    temperature = 1.0,
    maxOutputTokens = 1024,
    responseMimeType,
  } = options;

  // Check API key
  if (!ai) {
    return { success: false, error: 'Gemini API key is not configured', code: 'NO_API_KEY' };
  }

  // Check rate limit
  if (!consumeRateToken()) {
    return { success: false, error: 'AI rate limit exceeded. Please try again later.', code: 'RATE_LIMITED' };
  }

  try {
    // Build the contents array for the new SDK
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

    if (imageParts) {
      for (const img of imageParts) {
        parts.push(img);
      }
    }

    parts.push({ text: prompt });

    // Race between generation and timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
    });

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts }],
      config: {
        temperature,
        maxOutputTokens,
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(responseMimeType ? { responseMimeType } : {}),
      },
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);

    const text = result.text;

    if (!text || text.trim().length === 0) {
      return { success: false, error: 'AI returned an empty response', code: 'GENERATION_ERROR' };
    }

    return { success: true, text: text.trim() };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown AI error';

    if (message.includes('timed out')) {
      return { success: false, error: 'AI request timed out', code: 'TIMEOUT' };
    }
    if (message.includes('SAFETY') || message.includes('blocked')) {
      return { success: false, error: 'Response blocked by safety filters', code: 'BLOCKED' };
    }

    console.error('[AI Client]', error);
    return { success: false, error: message, code: 'GENERATION_ERROR' };
  }
}
