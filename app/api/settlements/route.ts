import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getSettlementsByGroup, createSettlement } from '@/lib/db/queries/settlements';

/**
 * GET /api/settlements?groupId=
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
  }

  try {
    const settlements = await getSettlementsByGroup(groupId, session.user.id);
    return NextResponse.json({ settlements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/settlements
 * Body: { groupId, toUserId, amount, note? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { groupId, toUserId, amount, note } = body;

    if (!groupId || !toUserId || amount == null) {
      return NextResponse.json({ error: 'groupId, toUserId, and amount are required' }, { status: 400 });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const fromUserId = session.user.id;

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Cannot settle with yourself' }, { status: 400 });
    }

    const settlement = await createSettlement(groupId, fromUserId, toUserId, amount, note);
    return NextResponse.json({ settlement }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message.includes('must be members') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
