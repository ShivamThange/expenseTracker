import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getExpensesByGroup, getExpensesByUser, createExpense } from '@/lib/db/queries/expenses';
import { getOrCreatePersonalGroup } from '@/lib/db/queries/groups';

/**
 * GET /api/expenses?groupId=&page=&limit=&category=
 * Lists expenses for a group. User must be a member.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const groupId = searchParams.get('groupId');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const category = searchParams.get('category') ?? undefined;

  try {
    let result;
    if (!groupId || groupId === 'all') {
      result = await getExpensesByUser(session.user.id, { page, limit, category });
    } else {
      result = await getExpensesByGroup(groupId, session.user.id, { page, limit, category });
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message.includes('Forbidden') ? 403 : 500;
    console.error('[GET /api/expenses]', error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/expenses
 * Body: { groupId, description, amount, category?, payerId, splits, date?, receiptUrl? }
 * Creates a new expense. All split users and payer must be group members.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    let { groupId, description, amount, category, payerId, splits, date, receiptUrl } = body;

    // Basic input validation
    if (!description || amount == null || !payerId || !splits) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, payerId, splits' },
        { status: 400 }
      );
    }

    if (!groupId) {
       const personalGroup = await getOrCreatePersonalGroup(session.user.id);
       groupId = personalGroup.id;
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    if (!Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json({ error: 'Splits must be a non-empty array' }, { status: 400 });
    }

    const expense = await createExpense(
      {
        groupId,
        description,
        amount,
        category,
        payerId,
        splits,
        date: date ? new Date(date) : undefined,
        receiptUrl,
      },
      session.user.id
    );

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status =
      message.includes('Forbidden') ? 403 :
      message.includes('must equal') || message.includes('not a member') ? 400 : 500;
    console.error('[POST /api/expenses]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
