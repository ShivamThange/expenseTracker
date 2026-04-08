import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/db/connection';
import { Invitation } from '@/lib/models/Invitation';
import { addMemberToGroup } from '@/lib/db/queries/groups';
import { User } from '@/lib/models/User';
import mongoose from 'mongoose';
import crypto from 'crypto';

type Params = { params: Promise<{ token: string }> };

/**
 * POST /api/invitations/[token]/accept
 * Requires authentication.
 * Validates the token, adds the authenticated user to the group,
 * and marks the invitation as accepted.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await params;

  try {
    await connectToDatabase();

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await Invitation.findOne({ token: hashedToken });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 409 }
      );
    }

    // Ensure the logged-in user's email matches the invitation
    if (invitation.inviteeEmail !== session.user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Add the current user to the group using the group owner's privileges
    // We use the inviterUserId to provide owner-level access for the addMember call
    const inviterIdStr = (invitation.inviterUserId as mongoose.Types.ObjectId).toString();
    const groupIdStr = (invitation.groupId as mongoose.Types.ObjectId).toString();

    const result = await addMemberToGroup(
      groupIdStr,
      session.user.email,
      inviterIdStr // the original inviter acts as the requester (they are the owner)
    );

    if (!result.success && result.error !== 'User is already a member') {
      return NextResponse.json({ error: result.error ?? 'Failed to join group' }, { status: 400 });
    }

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    return NextResponse.json({
      message: 'You have successfully joined the group!',
      groupId: groupIdStr,
    });
  } catch (error) {
    console.error('[POST /api/invitations/[token]/accept]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
