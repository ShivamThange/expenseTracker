import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/models/User';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    await connectToDatabase();

    // The token sent to user is raw. We must hash it to find in DB.
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({ verifyEmailToken: hashedToken });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Mark as verified and clear the token
    user.emailVerified = new Date();
    user.verifyEmailToken = undefined;
    
    await user.save();

    return NextResponse.json({ message: 'Email verified successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('Verify Email API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
