import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { generate } from '@/lib/ai/client';

export const maxDuration = 60; // Allow more time for image processing

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
      const parsed = JSON.parse(result.text);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error('[AI Bill Scan] JSON Parse Error:', result.text);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('[POST /api/ai/scan-bill]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
