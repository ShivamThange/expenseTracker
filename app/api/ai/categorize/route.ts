import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { generate } from '@/lib/ai/client';


const VALID_CATEGORIES = [
  'General',
  'Food',
  'Transport',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Subscriptions',
] as const;

const SYSTEM_INSTRUCTION = `You are a financial expense categorizer. Given an expense description, return EXACTLY ONE category from this list:
${VALID_CATEGORIES.join(', ')}

Rules:
- Reply with ONLY the category name, nothing else—no punctuation, no explanation.
- If the description is ambiguous, choose the best-fitting category.
- Default to "General" if nothing fits.

Examples:
- "Uber to airport" → Transport
- "Netflix monthly" → Subscriptions
- "Dinner at restaurant" → Food
- "Electricity bill" → Utilities
- "Hotel in Paris" → Accommodation`;

/**
 * POST /api/ai/categorize
 * Body: { description: string, amount?: number }
 * Returns: { category: string } or { error: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { description, amount } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'description is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Build prompt with optional context
    let prompt = `Categorize this expense: "${description.trim()}"`;
    if (typeof amount === 'number' && amount > 0) {
      prompt += ` (amount: ${amount.toFixed(2)})`;
    }

    const result = await generate({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt,
      temperature: 0.1, // very deterministic for categorization
      maxOutputTokens: 32,
      timeoutMs: 10_000,
    });

    if (!result.success) {
      // Fallback to "General" if AI fails, but still inform the client
      return NextResponse.json({
        category: 'General',
        fallback: true,
        reason: result.error,
      });
    }

    // Validate the response is one of our categories (case-insensitive match)
    const rawCategory = result.text.trim();
    const matched = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === rawCategory.toLowerCase()
    );

    return NextResponse.json({
      category: matched ?? 'General',
      fallback: !matched,
    });
  } catch (error: unknown) {
    console.error('[POST /api/ai/categorize]', error);
    return NextResponse.json(
      { category: 'General', fallback: true, reason: 'Internal error' }
    );
  }
}
