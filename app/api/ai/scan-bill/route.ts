import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { generate } from '@/lib/ai/client';

export const maxDuration = 60; // Allow more time for image processing

const VALID_CATEGORIES = new Set([
  'General',
  'Food',
  'Transport',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Utilities',
]);

type ScanBillResponse = {
  description: string;
  amount: number;
  category: string;
  splits: Array<{ userId: string; amount: number }>;
};

function extractJsonText(rawText: string): string {
  const trimmed = rawText.trim();
  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFenceMatch?.[1]) {
    return codeFenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseAndNormalize(rawText: string, fallbackMembers: Array<{ id: string }>): ScanBillResponse {
  const jsonText = extractJsonText(rawText);
  const parsed = JSON.parse(jsonText) as {
    description?: unknown;
    amount?: unknown;
    category?: unknown;
    splits?: unknown;
  };

  const description = typeof parsed.description === 'string' && parsed.description.trim()
    ? parsed.description.trim()
    : 'Scanned Bill';

  const parsedSplits = Array.isArray(parsed.splits)
    ? parsed.splits
        .map((split): { userId: string; amount: number } | null => {
          if (!split || typeof split !== 'object') return null;
          const rawUserId = (split as { userId?: unknown }).userId;
          const rawAmount = (split as { amount?: unknown }).amount;
          if (typeof rawUserId !== 'string' || !rawUserId.trim()) return null;
          const amount = parseNumber(rawAmount);
          if (amount === null || amount < 0) return null;
          return { userId: rawUserId.trim(), amount: Math.round(amount * 100) / 100 };
        })
        .filter((split): split is { userId: string; amount: number } => Boolean(split))
    : [];

  const amountFromField = parseNumber(parsed.amount);
  const amountFromSplits = Math.round(parsedSplits.reduce((sum, split) => sum + split.amount, 0) * 100) / 100;
  const amount = amountFromField ?? amountFromSplits;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('AI response missing valid amount');
  }

  const category = typeof parsed.category === 'string' && VALID_CATEGORIES.has(parsed.category)
    ? parsed.category
    : 'General';

  if (parsedSplits.length === 0) {
    const memberCount = fallbackMembers.length;
    if (memberCount === 0) {
      throw new Error('No members available to split bill');
    }
    const perPerson = Math.round((amount / memberCount) * 100) / 100;
    const fallbackSplits = fallbackMembers.map((member) => ({ userId: member.id, amount: perPerson }));
    const diff = Math.round((amount - fallbackSplits.reduce((sum, split) => sum + split.amount, 0)) * 100) / 100;
    if (diff !== 0) {
      fallbackSplits[0].amount = Math.round((fallbackSplits[0].amount + diff) * 100) / 100;
    }
    return { description, amount, category, splits: fallbackSplits };
  }

  const splitTotal = Math.round(parsedSplits.reduce((sum, split) => sum + split.amount, 0) * 100) / 100;
  const diff = Math.round((amount - splitTotal) * 100) / 100;
  if (Math.abs(diff) > 0.01) {
    parsedSplits[0].amount = Math.round((parsedSplits[0].amount + diff) * 100) / 100;
  }

  return { description, amount, category, splits: parsedSplits };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { imageBase64, mimeType, message, members } = await req.json();

    if (!imageBase64 || !mimeType || !members || !Array.isArray(members)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const systemInstruction = `You are an expert bill and receipt parser. You are given an image of a receipt/bill and an optional user message specifying who consumed what. You also receive a list of the group members.

Your goal is to parse the bill and allocate the costs to the correct members based on the user message.
- Consider taxes, tips, and other overheads by spreading them proportionally among the allocated items.
- If the user specifies an item, find its price on the receipt, add its proportional share of overhead, and assign it to that user.
- Any remaining unassigned items or costs should be split equally among all members.
- If no user message is given, split the entire total equally among all members.
- Total sum of splits MUST exactly match the overall bill total amount. Adjust fractional cents on the first user to ensure perfect match.

Return ONLY a raw JSON object with the following schema:
{
  "description": string, // short description (e.g. "Dinner at McDonald's")
  "amount": number, // exact total amount of the bill
  "category": string, // 'General' | 'Food' | 'Transport' | 'Accommodation' | 'Entertainment' | 'Shopping' | 'Utilities'
  "splits": [
    { "userId": string, "amount": number } // amounts must sum exactly to total amount
  ]
}`;

    const prompt = `Members available: ${JSON.stringify(members)}
Message from user: ${message || 'No additional instructions provided. Split evenly.'}`;

    const result = await generate({
      systemInstruction,
      prompt,
      imageParts: [{ inlineData: { data: imageBase64, mimeType } }],
      timeoutMs: 45000, 
      responseMimeType: 'application/json',
      temperature: 0.1, // very low temperature for analytical tasks
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    try {
      const parsed = parseAndNormalize(result.text, members);
      return NextResponse.json(parsed);
    } catch {
      console.error('[AI Bill Scan] JSON Parse Error:', result.text);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('[POST /api/ai/scan-bill]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
