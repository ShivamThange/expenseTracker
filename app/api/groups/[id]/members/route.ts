import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { addMemberToGroup } from '@/lib/db/queries/groups';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/groups/[id]/members
 * Body: { email: string }
 * Adds a registered user (by email) to the group. Owner only.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await addMemberToGroup(id, email, session.user.id);

    if (!result.success) {
      const status =
        result.error?.includes('owner') ? 403 :
        result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('[POST /api/groups/[id]/members]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
