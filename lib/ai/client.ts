import 'server-only';

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ---------------------------------------------------------------------------
// AGENT_TASK_601: Gemini AI Client
//
// Singleton wrapper around the Google Generative AI SDK with:
//   - Rate limiting (token-bucket style, 10 requests / minute)
//   - Timeout control (15s default)
//   - Structured error handling
//   - Safety settings to block harmful content
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('[AI] GEMINI_API_KEY is not set — AI features will be disabled.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

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
// Safety settings
// ---------------------------------------------------------------------------

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ---------------------------------------------------------------------------
// Core generation function
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  /** System instruction to guide the model */
  systemInstruction?: string;
  /** User prompt */
  prompt: string;
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Model to use (default: gemini-2.0-flash) */
  model?: string;
  /** Temperature for generation (default: 0.3 — deterministic for categorization) */
  temperature?: number;
  /** Max output tokens */
  maxOutputTokens?: number;
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
 * Generate text using Google Gemini.
 * Includes built-in rate limiting, timeout control, and structured error handling.
 */
export async function generate(options: GenerateOptions): Promise<GenerateResponse> {
  const {
    systemInstruction,
    prompt,
    timeoutMs = 15_000,
    model: modelName = 'gemini-2.0-flash',
    temperature = 0.3,
    maxOutputTokens = 1024,
  } = options;

  // Check API key
  if (!genAI) {
    return { success: false, error: 'Gemini API key is not configured', code: 'NO_API_KEY' };
  }

  // Check rate limit
  if (!consumeRateToken()) {
    return { success: false, error: 'AI rate limit exceeded. Please try again later.', code: 'RATE_LIMITED' };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      safetySettings,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
      ...(systemInstruction ? { systemInstruction } : {}),
    });

    // Race between generation and timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () =>
            reject(new Error('AI request timed out'))
          );
        }),
      ]);

      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        return { success: false, error: 'AI returned an empty response', code: 'GENERATION_ERROR' };
      }

      return { success: true, text: text.trim() };
    } finally {
      clearTimeout(timeout);
    }
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
