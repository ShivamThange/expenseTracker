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

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseAndNormalize(rawText: string, fallbackMembers: MemberRef[]): ScanBillResponse {
  const jsonText = extractJsonText(rawText);
  const parsed = JSON.parse(jsonText) as {
    description?: unknown;
    amount?: unknown;
    category?: unknown;
    memberShares?: unknown;
    splits?: unknown;
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
      : [];

  const parsedShares = rawShares
    .map((share): { userId: string; userName: string; amount: number } | null => {
      if (!share || typeof share !== 'object') return null;

      const rawUserId = (share as { userId?: unknown }).userId;
      const rawUserName = (share as { userName?: unknown; name?: unknown }).userName
        ?? (share as { userName?: unknown; name?: unknown }).name;
      const rawAmount = (share as { amount?: unknown }).amount;

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

  const amountFromField = parseNumber(parsed.amount);
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

    const systemInstruction = `You are an expert bill and receipt parser. You are given an image of a receipt/bill and an optional user message specifying who consumed what. You also receive a list of the group members with their IDs and names.

Your goal is to parse the bill and allocate the costs to the correct members based on the user message.
- Consider taxes, tips, and other overheads by spreading them proportionally among the allocated items.
- If the user specifies an item, find its price on the receipt, add its proportional share of overhead, and assign it to that user.
- Any remaining unassigned items or costs should be split equally among all members.
- If no user message is given, split the entire total equally among all members.
- Total sum of shares MUST exactly match the overall bill total amount. Adjust fractional cents on the first user to ensure perfect match.

Return ONLY a raw JSON object with the following schema:
{
  "description": string, // short description (e.g. "Dinner at McDonald's")
  "amount": number, // exact total amount of the bill
  "category": string, // 'General' | 'Food' | 'Transport' | 'Accommodation' | 'Entertainment' | 'Shopping' | 'Utilities'
  "memberShares": [
    { "userId": string, "userName": string, "amount": number } // only use IDs and names from provided members list; amounts must sum exactly to total amount
  ]
}`;

    const prompt = `Members available: ${JSON.stringify(memberRefs)}
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
      const parsed = parseAndNormalize(result.text, memberRefs);
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
