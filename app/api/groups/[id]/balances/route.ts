import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getGroupById } from '@/lib/db/queries/groups';
import { getExpensesByGroup } from '@/lib/db/queries/expenses';
import { getSettlementsByGroup } from '@/lib/db/queries/settlements';
import { calculateBalances, getBalanceSummary } from '@/lib/utils/balance-calculator';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/groups/[id]/balances
 * Returns:
 *   - balances: Map<userId, netBalance> (serialized as array of {userId, balance})
 *   - settlements: minimum-transaction settlement plan
 *   - summary: per-member summary relative to the requesting user
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify user is a member of the group
    const group = await getGroupById(id, session.user.id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Fetch ALL expenses for the group (no pagination — needed for accurate balances)
    const { expenses } = await getExpensesByGroup(id, session.user.id, { limit: 10000 });

    // Map DTOs to calculator input format
    const expenseRecords = expenses.map((e) => ({
      payerId: e.payerId,
      amount: e.amount,
      splits: e.splits,
    }));

    // Treat confirmed settlements as expenses where `fromUserId` pays `toUserId`
    const groupSettlements = await getSettlementsByGroup(id, session.user.id);
    for (const s of groupSettlements) {
      if (s.status === 'confirmed') {
        expenseRecords.push({
          payerId: s.fromUserId,
          amount: s.amount,
          splits: [{ userId: s.toUserId, amount: s.amount }],
        });
      }
    }

    const { balances, settlements } = calculateBalances(expenseRecords);

    // Serialize Map to array for JSON response
    const balancesArray = Array.from(balances.entries()).map(([userId, balance]) => ({
      userId,
      balance: Math.round(balance * 100) / 100,
    }));

    // Per-user summary relative to the requester
    const summary = getBalanceSummary(session.user.id, settlements);

    return NextResponse.json({
      groupId: id,
      currency: group.currency,
      balances: balancesArray,
      settlements,
      summary,
      recordedSettlements: groupSettlements,
    });
  } catch (error) {
    console.error('[GET /api/groups/[id]/balances]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
