import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getGroupsByUser, createGroup } from '@/lib/db/queries/groups';

/**
 * GET /api/groups
 * Returns all groups the authenticated user belongs to.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const groups = await getGroupsByUser(session.user.id);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('[GET /api/groups]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/groups
 * Body: { name: string, description?: string, currency?: string }
 * Creates a new group and adds the creator as owner + first member.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, currency } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Group name must be 100 characters or less' }, { status: 400 });
    }

    const group = await createGroup({ name, description, currency }, session.user.id);
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/groups]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
