import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getExpenseById, updateExpense, deleteExpense } from '@/lib/db/queries/expenses';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/expenses/[id]
 * Returns a single expense. User must be a member of the associated group.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const expense = await getExpenseById(id, session.user.id);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    return NextResponse.json({ expense });
  } catch (error) {
    console.error('[GET /api/expenses/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/expenses/[id]
 * Body: partial expense update { description?, amount?, category?, payerId?, splits?, date?, receiptUrl? }
 * Only the creator or group owner can update.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { description, amount, category, payerId, splits, date, receiptUrl } = body;

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const expense = await updateExpense(
      id,
      {
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

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status =
      message.includes('Forbidden') ? 403 :
      message.includes('must equal') || message.includes('not a member') ? 400 : 500;
    console.error('[PATCH /api/expenses/[id]]', error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/expenses/[id]
 * Deletes an expense. Only the creator or group owner can delete.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteExpense(id, session.user.id);

    if (!result.success) {
      const status =
        result.error === 'Forbidden' || result.error?.includes('creator') ? 403 :
        result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/expenses/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
