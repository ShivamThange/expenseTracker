import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/db/connection';
import { Invitation } from '@/lib/models/Invitation';
import { Group } from '@/lib/models/Group';
import { User } from '@/lib/models/User';

import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * POST /api/invitations
 * Body: { groupId: string, inviteeEmail: string }
 * Creates an invitation and sends an email to the invitee.
 * Only the group owner can send invitations.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { groupId, inviteeEmail } = body;

    if (!groupId || !inviteeEmail) {
      return NextResponse.json({ error: 'groupId and inviteeEmail are required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify requester is the group owner
    const group = await Group.findOne({
      _id: groupId,
      ownerId: new mongoose.Types.ObjectId(session.user.id),
    })
      .select('name ownerId memberIds')
      .lean();

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or you are not the owner' },
        { status: 403 }
      );
    }

    // Check invitee is not already a member
    const invitee = await User.findOne({ email: inviteeEmail.toLowerCase().trim() })
      .select('_id name email')
      .lean();

    if (invitee) {
      const alreadyMember = (group.memberIds as mongoose.Types.ObjectId[]).some(
        (id) => id.toString() === (invitee._id as mongoose.Types.ObjectId).toString()
      );
      if (alreadyMember) {
        return NextResponse.json({ error: 'User is already a member of this group' }, { status: 400 });
      }
    }

    // Upsert the invitation (one pending invite per invitee+group)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await Invitation.findOneAndUpdate(
      {
        groupId: new mongoose.Types.ObjectId(groupId),
        inviteeEmail: inviteeEmail.toLowerCase().trim(),
      },
      {
        inviterUserId: new mongoose.Types.ObjectId(session.user.id),
        status: 'pending',
        token: hashedToken,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    // Send invitation email
    const inviterName = session.user.name ?? 'A friend';
    const groupName = (group as { name: string }).name;
    const inviteLink = `${process.env.NEXTAUTH_URL}/invitations/${rawToken}`;

    // Reuse the Resend integration — send a simple invite email
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    await resend.emails.send({
      from: `Smart Expense Splitter <${fromEmail}>`,
      to: inviteeEmail,
      subject: `${inviterName} invited you to join "${groupName}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111;">You've been invited!</h2>
          <p><strong>${inviterName}</strong> has invited you to join the expense group <strong>"${groupName}"</strong> on Smart Expense Splitter.</p>
          <a href="${inviteLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
            Accept Invitation
          </a>
          <p style="margin-top:24px;color:#666;font-size:13px;">This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: 'Invitation sent successfully' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/invitations]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
