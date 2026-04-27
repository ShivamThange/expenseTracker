import 'server-only';

import { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// Gemini AI Client — singleton with rate limiting, timeout, and model fallback
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
  /** Optional JSON schema for structured responses */
  responseJsonSchema?: unknown;
}

export interface GenerateResult {
  text: string;
  success: true;
}

export interface GenerateError {
  success: false;
  error: string;
  code: 'NO_API_KEY' | 'RATE_LIMITED' | 'TIMEOUT' | 'GENERATION_ERROR' | 'BLOCKED' | 'OVERLOADED';
}

export type GenerateResponse = GenerateResult | GenerateError;

// Fallback chain tried in order when the primary model is overloaded.
const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

function isOverloadedError(message: string): boolean {
  return (
    message.includes('503') ||
    message.includes('overloaded') ||
    message.includes('UNAVAILABLE') ||
    message.includes('Service Unavailable') ||
    // 429 from Gemini means quota/capacity, treat as overload for fallback purposes
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED')
  );
}

async function generateWithModel(
  modelName: string,
  options: GenerateOptions
): Promise<GenerateResponse> {
  const {
    systemInstruction,
    prompt,
    imageParts,
    timeoutMs = 15_000,
    temperature = 1.0,
    maxOutputTokens = 1024,
    responseMimeType,
    responseJsonSchema,
  } = options;

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
  if (imageParts) {
    for (const img of imageParts) parts.push(img);
  }
  parts.push({ text: prompt });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
  );

  const generatePromise = ai!.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts }],
    config: {
      temperature,
      maxOutputTokens,
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(responseMimeType ? { responseMimeType } : {}),
      ...(responseJsonSchema ? { responseJsonSchema } : {}),
    },
  });

  const result = await Promise.race([generatePromise, timeoutPromise]);
  const text = result.text;

  if (!text || text.trim().length === 0) {
    return { success: false, error: 'AI returned an empty response', code: 'GENERATION_ERROR' };
  }

  return { success: true, text: text.trim() };
}

/**
 * Generate text using Google Gemini via the new @google/genai SDK.
 * Includes built-in rate limiting, timeout control, structured error handling,
 * and automatic fallback to other models when the primary is overloaded.
 */
export async function generate(options: GenerateOptions): Promise<GenerateResponse> {
  if (!ai) {
    return { success: false, error: 'Gemini API key is not configured', code: 'NO_API_KEY' };
  }

  if (!consumeRateToken()) {
    return { success: false, error: 'AI rate limit exceeded. Please try again later.', code: 'RATE_LIMITED' };
  }

  const primaryModel = options.model ?? 'gemini-2.5-flash';
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError = '';

  for (const modelName of modelsToTry) {
    try {
      const result = await generateWithModel(modelName, { ...options, model: modelName });

      if (result.success) {
        if (modelName !== primaryModel) {
          console.warn(`[AI Client] Primary model overloaded — used fallback: ${modelName}`);
        }
        return result;
      }

      // Non-overload failures (blocked, empty) — don't try other models
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown AI error';

      if (message.includes('timed out')) {
        return { success: false, error: 'AI request timed out', code: 'TIMEOUT' };
      }
      if (message.includes('SAFETY') || message.includes('blocked')) {
        return { success: false, error: 'Response blocked by safety filters', code: 'BLOCKED' };
      }

      if (isOverloadedError(message)) {
        console.warn(`[AI Client] Model ${modelName} overloaded, trying next fallback...`);
        lastError = message;
        continue;
      }

      console.error('[AI Client]', error);
      return { success: false, error: message, code: 'GENERATION_ERROR' };
    }
  }

  return {
    success: false,
    error: `All models are currently overloaded. Please try again shortly. (${lastError})`,
    code: 'OVERLOADED',
  };
}
