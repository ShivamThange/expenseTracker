import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { confirmSettlement } from '@/lib/db/queries/settlements';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/settlements/[id]/confirm
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const settlement = await confirmSettlement(id, session.user.id);
    return NextResponse.json({ settlement });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = 
      message.includes('Forbidden') ? 403 :
      message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
