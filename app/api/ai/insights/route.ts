import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { generate } from '@/lib/ai/client';
import { getExpensesByGroup } from '@/lib/db/queries/expenses';


const SYSTEM_INSTRUCTION = `You are a personal finance advisor analyzing shared group expenses. Your job is to analyze expense data and provide concise, actionable insights.

Return your response as a valid JSON object with this exact structure:
{
  "summary": "A 1-2 sentence overview of the group's spending pattern",
  "insights": [
    {
      "type": "spending_pattern" | "saving_tip" | "anomaly" | "trend",
      "title": "Short title (5-8 words max)",
      "description": "1-2 sentence actionable insight"
    }
  ],
  "topCategory": "The category with the most spending",
  "topCategoryAmount": 0.00,
  "monthOverMonthChange": "up" | "down" | "stable" | "insufficient_data"
}

Rules:
- Provide 3-5 insights maximum.
- Be specific with dollar amounts where relevant.
- Focus on actionable advice, not just observations.
- If there's very little data, say so and keep insights minimal.
- Return ONLY the JSON object, no markdown fencing, no extra text.`;

/**
 * POST /api/ai/insights
 * Body: { groupId: string }
 * Returns: { insights: object } or { error: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { groupId } = body;

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        { error: 'groupId is required' },
        { status: 400 }
      );
    }

    // Fetch expenses for context (up to 100 most recent)
    let expenseData;
    try {
      expenseData = await getExpensesByGroup(groupId, session.user.id, {
        limit: 100,
        page: 1,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Access denied';
      const status = message.includes('Forbidden') ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    const { expenses, total } = expenseData;

    if (expenses.length === 0) {
      return NextResponse.json({
        insights: {
          summary: 'No expenses recorded yet. Start adding expenses to get AI-powered insights.',
          insights: [],
          topCategory: null,
          topCategoryAmount: 0,
          monthOverMonthChange: 'insufficient_data',
        },
      });
    }

    // Aggregate data for the prompt
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryBreakdown: Record<string, number> = {};
    for (const exp of expenses) {
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] ?? 0) + exp.amount;
    }

    // Monthly breakdown
    const monthlySpend: Record<string, number> = {};
    for (const exp of expenses) {
      const month = exp.date.slice(0, 7); // YYYY-MM
      monthlySpend[month] = (monthlySpend[month] ?? 0) + exp.amount;
    }

    const prompt = `Analyze these group expenses and provide insights:

Total expenses: ${total}
Total amount: $${totalSpent.toFixed(2)}
Number of expenses shown: ${expenses.length}

Category breakdown:
${Object.entries(categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)} (${((amt / totalSpent) * 100).toFixed(1)}%)`)
  .join('\n')}

Monthly spending:
${Object.entries(monthlySpend)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, amt]) => `- ${month}: $${amt.toFixed(2)}`)
  .join('\n')}

Recent expenses (last 10):
${expenses
  .slice(0, 10)
  .map((e) => `- "${e.description}" — $${e.amount.toFixed(2)} (${e.category}, ${e.date.slice(0, 10)})`)
  .join('\n')}`;

    const result = await generate({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt,
      temperature: 0.5,
      maxOutputTokens: 800,
      timeoutMs: 20_000,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          insights: buildFallbackInsights(categoryBreakdown, totalSpent, monthlySpend),
          fallback: true,
          reason: result.error,
        }
      );
    }

    // Parse the JSON response from the model
    try {
      const parsed = JSON.parse(result.text);
      return NextResponse.json({ insights: parsed });
    } catch {
      // If the model returned non-JSON, wrap the text
      return NextResponse.json({
        insights: {
          summary: result.text,
          insights: [],
          topCategory: Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null,
          topCategoryAmount: Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0]?.[1] ?? 0,
          monthOverMonthChange: 'insufficient_data',
        },
        fallback: true,
      });
    }
  } catch (error: unknown) {
    console.error('[POST /api/ai/insights]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Fallback: Generate basic insights without AI when Gemini is unavailable
// ---------------------------------------------------------------------------

function buildFallbackInsights(
  categoryBreakdown: Record<string, number>,
  totalSpent: number,
  monthlySpend: Record<string, number>
) {
  const sorted = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a);
  const topCategory = sorted[0]?.[0] ?? 'General';
  const topAmount = sorted[0]?.[1] ?? 0;

  const months = Object.entries(monthlySpend).sort(([a], [b]) => a.localeCompare(b));
  let trend: 'up' | 'down' | 'stable' | 'insufficient_data' = 'insufficient_data';
  if (months.length >= 2) {
    const latest = months[months.length - 1][1];
    const previous = months[months.length - 2][1];
    const change = ((latest - previous) / previous) * 100;
    trend = change > 10 ? 'up' : change < -10 ? 'down' : 'stable';
  }

  const insights = [
    {
      type: 'spending_pattern' as const,
      title: `${topCategory} is your top category`,
      description: `You've spent $${topAmount.toFixed(2)} on ${topCategory}, which is ${((topAmount / totalSpent) * 100).toFixed(0)}% of total spending.`,
    },
  ];

  if (sorted.length > 1) {
    insights.push({
      type: 'spending_pattern' as const,
      title: `${sorted.length} categories tracked`,
      description: `Spending is spread across ${sorted.length} categories. Your top two are ${sorted[0][0]} and ${sorted[1][0]}.`,
    });
  }

  return {
    summary: `Total group spending is $${totalSpent.toFixed(2)} across ${sorted.length} categories.`,
    insights,
    topCategory,
    topCategoryAmount: topAmount,
    monthOverMonthChange: trend,
  };
}
