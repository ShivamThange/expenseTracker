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
  memberShares: Array<{ userId: string; userName: string; amount: number }>;
  splits: Array<{ userId: string; amount: number }>;
};

type MemberRef = { id: string; name: string };

const scanBillResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['description', 'amount', 'category', 'memberShares'],
  properties: {
    description: { type: 'string' },
    amount: { type: 'number' },
    category: {
      type: 'string',
      enum: Array.from(VALID_CATEGORIES),
    },
    memberShares: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['userId', 'userName', 'amount'],
        properties: {
          userId: { type: 'string' },
          userName: { type: 'string' },
          amount: { type: 'number' },
        },
      },
    },
  },
} as const;

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

function safeJsonParse(rawJsonText: string): unknown {
  const trimmed = rawJsonText.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Try common cleanup patterns from LLM output
    const normalizedQuotes = trimmed
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    const withoutTrailingCommas = normalizedQuotes
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(withoutTrailingCommas);
  }
}

function parseLooseObjectFromText(rawText: string): Record<string, unknown> {
  const text = rawText.trim();
  const loose: Record<string, unknown> = {};

  // Works even when JSON is truncated after these fields.
  const descriptionMatch = text.match(/"description"\s*:\s*"([^"\r\n]*)/i);
  if (descriptionMatch?.[1]) {
    loose.description = descriptionMatch[1];
  }

  const amountMatch = text.match(/"amount"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  if (amountMatch?.[1]) {
    loose.amount = Number(amountMatch[1]);
  }

  const categoryMatch = text.match(/"category"\s*:\s*"([^"\r\n]*)/i);
  if (categoryMatch?.[1]) {
    loose.category = categoryMatch[1];
  }

  return loose;
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

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseAndNormalize(rawText: string, fallbackMembers: MemberRef[]): ScanBillResponse {
  const jsonText = extractJsonText(rawText);
  let parsedUnknown: unknown;
  try {
    parsedUnknown = safeJsonParse(jsonText);
  } catch {
    parsedUnknown = parseLooseObjectFromText(rawText);
  }

  const unwrapObject = (value: unknown): Record<string, unknown> => {
    if (typeof value === 'string') {
      const nested = safeJsonParse(extractJsonText(value));
      return unwrapObject(nested);
    }
    if (Array.isArray(value)) {
      const firstObject = value.find((item) => item && typeof item === 'object' && !Array.isArray(item));
      if (!firstObject) throw new Error('AI response array has no object payload');
      return firstObject as Record<string, unknown>;
    }
    if (!value || typeof value !== 'object') {
      throw new Error('AI response is not a valid JSON object');
    }
    return value as Record<string, unknown>;
  };

  const parsed = unwrapObject(parsedUnknown) as {
    description?: unknown;
    amount?: unknown;
    total?: unknown;
    totalAmount?: unknown;
    billTotal?: unknown;
    category?: unknown;
    memberShares?: unknown;
    splits?: unknown;
    shares?: unknown;
    allocations?: unknown;
    split?: unknown;
    shareByMember?: unknown;
  };

  const description = typeof parsed.description === 'string' && parsed.description.trim()
    ? parsed.description.trim()
    : 'Scanned Bill';

  const memberById = new Map(fallbackMembers.map((member) => [member.id, member]));
  const memberByName = new Map(fallbackMembers.map((member) => [normalizeName(member.name), member]));

  const rawShares = Array.isArray(parsed.memberShares)
    ? parsed.memberShares
    : Array.isArray(parsed.splits)
      ? parsed.splits
      : Array.isArray(parsed.shares)
        ? parsed.shares
        : Array.isArray(parsed.allocations)
          ? parsed.allocations
          : Array.isArray(parsed.split)
            ? parsed.split
            : [];

  const parsedShares = rawShares
    .map((share): { userId: string; userName: string; amount: number } | null => {
      if (!share || typeof share !== 'object') return null;

      const rawUserId =
        (share as { userId?: unknown; memberId?: unknown; id?: unknown; personId?: unknown }).userId
        ?? (share as { userId?: unknown; memberId?: unknown; id?: unknown; personId?: unknown }).memberId
        ?? (share as { userId?: unknown; memberId?: unknown; id?: unknown; personId?: unknown }).id
        ?? (share as { userId?: unknown; memberId?: unknown; id?: unknown; personId?: unknown }).personId;
      const rawUserName =
        (share as { userName?: unknown; memberName?: unknown; name?: unknown; person?: unknown }).userName
        ?? (share as { userName?: unknown; memberName?: unknown; name?: unknown; person?: unknown }).memberName
        ?? (share as { userName?: unknown; memberName?: unknown; name?: unknown; person?: unknown }).name
        ?? (share as { userName?: unknown; memberName?: unknown; name?: unknown; person?: unknown }).person;
      const rawAmount =
        (share as { amount?: unknown; share?: unknown; value?: unknown }).amount
        ?? (share as { amount?: unknown; share?: unknown; value?: unknown }).share
        ?? (share as { amount?: unknown; share?: unknown; value?: unknown }).value;

      const amount = parseNumber(rawAmount);
      if (amount === null || amount < 0) return null;

      let member: MemberRef | undefined;
      if (typeof rawUserId === 'string' && rawUserId.trim()) {
        member = memberById.get(rawUserId.trim());
      }
      if (!member && typeof rawUserName === 'string' && rawUserName.trim()) {
        member = memberByName.get(normalizeName(rawUserName));
      }
      if (!member) return null;

      return {
        userId: member.id,
        userName: member.name,
        amount: Math.round(amount * 100) / 100,
      };
    })
    .filter((share): share is { userId: string; userName: string; amount: number } => Boolean(share));

  // Accept object map format: { "Alice": 10.5, "Bob": 8.2 }
  if (parsedShares.length === 0 && parsed.shareByMember && typeof parsed.shareByMember === 'object' && !Array.isArray(parsed.shareByMember)) {
    for (const [memberName, memberAmount] of Object.entries(parsed.shareByMember as Record<string, unknown>)) {
      const member = memberByName.get(normalizeName(memberName));
      const amount = parseNumber(memberAmount);
      if (!member || amount === null || amount < 0) continue;
      parsedShares.push({
        userId: member.id,
        userName: member.name,
        amount: Math.round(amount * 100) / 100,
      });
    }
  }

  const amountFromField =
    parseNumber(parsed.amount)
    ?? parseNumber(parsed.totalAmount)
    ?? parseNumber(parsed.total)
    ?? parseNumber(parsed.billTotal);
  const amountFromShares = Math.round(parsedShares.reduce((sum, share) => sum + share.amount, 0) * 100) / 100;
  const amount = amountFromField ?? amountFromShares;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('AI response missing valid amount');
  }

  const category = typeof parsed.category === 'string' && VALID_CATEGORIES.has(parsed.category)
    ? parsed.category
    : 'General';

  if (parsedShares.length === 0) {
    const memberCount = fallbackMembers.length;
    if (memberCount === 0) {
      throw new Error('No members available to split bill');
    }
    const perPerson = Math.round((amount / memberCount) * 100) / 100;
    const fallbackShares = fallbackMembers.map((member) => ({
      userId: member.id,
      userName: member.name,
      amount: perPerson,
    }));
    const diff = Math.round((amount - fallbackShares.reduce((sum, share) => sum + share.amount, 0)) * 100) / 100;
    if (diff !== 0) {
      fallbackShares[0].amount = Math.round((fallbackShares[0].amount + diff) * 100) / 100;
    }
    return {
      description,
      amount,
      category,
      memberShares: fallbackShares,
      splits: fallbackShares.map((share) => ({ userId: share.userId, amount: share.amount })),
    };
  }

  const shareTotal = Math.round(parsedShares.reduce((sum, share) => sum + share.amount, 0) * 100) / 100;
  const diff = Math.round((amount - shareTotal) * 100) / 100;
  if (Math.abs(diff) > 0.01) {
    parsedShares[0].amount = Math.round((parsedShares[0].amount + diff) * 100) / 100;
  }

  return {
    description,
    amount,
    category,
    memberShares: parsedShares,
    splits: parsedShares.map((share) => ({ userId: share.userId, amount: share.amount })),
  };
}

function buildFallbackResponseFromRawText(rawText: string, members: MemberRef[]): ScanBillResponse | null {
  const loose = parseLooseObjectFromText(rawText);
  const amount = parseNumber(loose.amount);

  if (amount === null || amount <= 0 || members.length === 0) {
    return null;
  }

  const description = typeof loose.description === 'string' && loose.description.trim()
    ? loose.description.trim()
    : 'Scanned Bill';

  const category = typeof loose.category === 'string' && VALID_CATEGORIES.has(loose.category)
    ? loose.category
    : 'General';

  const baseShare = Math.round((amount / members.length) * 100) / 100;
  const memberShares = members.map((member) => ({
    userId: member.id,
    userName: member.name,
    amount: baseShare,
  }));

  const diff = Math.round((amount - memberShares.reduce((sum, share) => sum + share.amount, 0)) * 100) / 100;
  if (diff !== 0) {
    memberShares[0].amount = Math.round((memberShares[0].amount + diff) * 100) / 100;
  }

  return {
    description,
    amount,
    category,
    memberShares,
    splits: memberShares.map((share) => ({ userId: share.userId, amount: share.amount })),
  };
}

function buildSystemInstruction(): string {
  return `You are an expert bill parser and cost allocator. Your job is to read a receipt image and assign each line item to the correct person based on the user's description.

## STRICT RULES

1. **User instructions are the highest priority.** If the user says "Alex had the burger, Sam had the salad", you MUST assign those specific items to those specific people — do NOT split them equally.
2. **Unequal splits are expected and correct** when the user describes who ordered what.
3. **Always prorate overhead** (tax, tip, service charge, delivery fee) proportionally: each person's overhead = (their food subtotal / total food subtotal) × total overhead.
4. **Unmentioned items** that no one claimed: split equally among all members.
5. **The sum of all memberShares.amount MUST equal the bill total exactly.** Adjust the first member by any rounding difference.
6. Only use member IDs and names from the provided members list — never invent members.
7. Return ONLY a raw JSON object. No markdown, no code fences, no explanation.

## ALGORITHM

Step 1 — Extract all line items and prices from the receipt.
Step 2 — Separate overhead lines (tax, tip, gratuity, fees) from food/item lines.
Step 3 — Read the user's message and map each mentioned item to the person who had it.
Step 4 — For each person: sum their item prices, then add (their subtotal / total food subtotal) × total overhead.
Step 5 — Any unclaimed food items: add their cost divided equally to each member's share.
Step 6 — Verify the total matches; adjust first member for rounding.
Step 7 — Output the JSON.

## EXAMPLE

Receipt: Burger $15, Salad $10, Tax $2.50, Total $27.50
User says: "Alice had the burger, Bob had the salad"
Food subtotal = $25. Overhead = $2.50.
Alice: $15 + (15/25 × 2.50) = $15 + $1.50 = $16.50
Bob: $10 + (10/25 × 2.50) = $10 + $1.00 = $11.00
Total: $27.50 ✓`;
}

function buildPrompt(memberRefs: MemberRef[], message: string | undefined, malformedResponse?: string): string {
  const userInstruction = message?.trim()
    ? `USER INSTRUCTIONS (follow these exactly to assign items to people):\n"${message.trim()}"`
    : `USER INSTRUCTIONS: None provided. Split the entire total equally among all members.`;

  const basePrompt = `${userInstruction}

MEMBERS (use only these IDs and names):
${JSON.stringify(memberRefs, null, 2)}

Now parse the receipt image and return a JSON object with the fields: description, amount, category, memberShares.`;

  if (!malformedResponse) {
    return basePrompt;
  }

  return `${basePrompt}

IMPORTANT: Your previous response was malformed JSON:
${malformedResponse}

Return one complete, valid JSON object only. No truncation.`;
}

async function generateBillAllocation(
  imageBase64: string,
  mimeType: string,
  memberRefs: MemberRef[],
  message?: string,
  malformedResponse?: string
) {
  return generate({
    systemInstruction: buildSystemInstruction(),
    prompt: buildPrompt(memberRefs, message, malformedResponse),
    imageParts: [{ inlineData: { data: imageBase64, mimeType } }],
    timeoutMs: 45000,
    responseMimeType: 'application/json',
    responseJsonSchema: scanBillResponseSchema,
    temperature: 0.2,
    maxOutputTokens: 2048,
  });
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

    const memberRefs: MemberRef[] = members
      .filter((member: unknown): member is { id?: unknown; name?: unknown } => Boolean(member && typeof member === 'object'))
      .map((member) => ({
        id: typeof member.id === 'string' ? member.id : '',
        name: typeof member.name === 'string' ? member.name : '',
      }))
      .filter((member) => Boolean(member.id) && Boolean(member.name));

    const result = await generateBillAllocation(imageBase64, mimeType, memberRefs, message);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    try {
      const parsed = parseAndNormalize(result.text, memberRefs);
      return NextResponse.json(parsed);
    } catch (parseError: unknown) {
      const message = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('[AI Bill Scan] JSON Parse Error:', { message, aiText: result.text });

      const retryResult = await generateBillAllocation(imageBase64, mimeType, memberRefs, message, result.text);
      if (retryResult.success) {
        try {
          const retriedParsed = parseAndNormalize(retryResult.text, memberRefs);
          return NextResponse.json(retriedParsed);
        } catch (retryParseError: unknown) {
          const retryMessage = retryParseError instanceof Error ? retryParseError.message : 'Unknown parse error';
          console.error('[AI Bill Scan] Retry Parse Error:', { message: retryMessage, aiText: retryResult.text });

          const retryFallback = buildFallbackResponseFromRawText(retryResult.text, memberRefs);
          if (retryFallback) {
            console.warn('[AI Bill Scan] Recovered from partial AI response after retry');
            return NextResponse.json(retryFallback);
          }
        }
      }

      const fallback = buildFallbackResponseFromRawText(result.text, memberRefs);
      if (fallback) {
        console.warn('[AI Bill Scan] Recovered from partial AI response');
        return NextResponse.json(fallback);
      }

      return NextResponse.json(
        {
          error: 'Failed to parse AI response',
          details: message,
          aiRawResponse: result.text,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('[POST /api/ai/scan-bill]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
