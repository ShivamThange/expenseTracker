import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Invitation } from '@/lib/models/Invitation';
import { Group } from '@/lib/models/Group';
import { User } from '@/lib/models/User';
import mongoose from 'mongoose';
import crypto from 'crypto';

type Params = { params: Promise<{ token: string }> };

/**
 * GET /api/invitations/[token]
 * Returns invitation preview details without requiring authentication.
 * Used to show the "who invited you to which group" screen before login/register.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  try {
    await connectToDatabase();

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await Invitation.findOne({ token: hashedToken }).lean();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 409 }
      );
    }

    // Fetch group and inviter names for the preview screen
    const [group, inviter] = await Promise.all([
      Group.findById(invitation.groupId).select('name currency').lean(),
      User.findById(invitation.inviterUserId).select('name email').lean(),
    ]);

    return NextResponse.json({
      inviteeEmail: invitation.inviteeEmail,
      groupId: (invitation.groupId as mongoose.Types.ObjectId).toString(),
      groupName: (group as { name: string } | null)?.name ?? 'Unknown Group',
      groupCurrency: (group as { currency: string } | null)?.currency ?? 'USD',
      inviterName: (inviter as { name: string } | null)?.name ?? 'Someone',
      expiresAt: invitation.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/invitations/[token]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
