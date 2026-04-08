import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { removeMemberFromGroup } from '@/lib/db/queries/groups';

type Params = { params: Promise<{ id: string; userId: string }> };

/**
 * DELETE /api/groups/[id]/members/[userId]
 * Removes a member from the group. Owner only. Cannot remove owner.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, userId } = await params;

  try {
    const result = await removeMemberFromGroup(id, userId, session.user.id);

    if (!result.success) {
      const status =
        result.error?.includes('owner') ? 403 :
        result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('[DELETE /api/groups/[id]/members/[userId]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
