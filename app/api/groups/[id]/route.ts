import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getGroupWithMembers, deleteGroup } from '@/lib/db/queries/groups';
import { connectToDatabase } from '@/lib/db/connection';
import { Group } from '@/lib/models/Group';
import mongoose from 'mongoose';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/groups/[id]
 * Returns a single group with member details populated.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const group = await getGroupWithMembers(id, session.user.id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json({ group });
  } catch (error) {
    console.error('[GET /api/groups/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/groups/[id]
 * Body: { name?, description?, currency? }
 * Only the group owner can update group details.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, description, currency } = body;

    // Build update payload — only include provided fields
    const update: Record<string, string> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Group name cannot be empty' }, { status: 400 });
      }
      update.name = name.trim();
    }
    if (description !== undefined) update.description = description;
    if (currency !== undefined) {
      if (typeof currency !== 'string' || currency.length !== 3) {
        return NextResponse.json({ error: 'Currency must be a 3-letter code (e.g. USD)' }, { status: 400 });
      }
      update.currency = currency.toUpperCase();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectToDatabase();

    const group = await Group.findOneAndUpdate(
      { _id: id, ownerId: new mongoose.Types.ObjectId(session.user.id) },
      { $set: update },
      { new: true }
    ).lean();

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or you are not the owner' },
        { status: 403 }
      );
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error('[PATCH /api/groups/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/groups/[id]
 * Deletes the group and all its expenses. Owner only.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteGroup(id, session.user.id);
    if (!result.success) {
      const status = result.error?.includes('owner') ? 403 : 404;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/groups/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
