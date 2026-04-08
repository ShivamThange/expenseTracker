import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { User, IUser } from '@/lib/models/User';
import { sendPasswordResetEmail } from '@/lib/email/send';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Missing email address' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase() }) as IUser;

    // Do not reveal if the user exists or not for security reasons
    if (!user) {
      return NextResponse.json({ message: 'If that email is registered, we have sent a reset link to it.' }, { status: 200 });
    }

    const rawToken = user.generateResetToken();
    await user.save();

    const emailResult = await sendPasswordResetEmail(user.email, user.name, rawToken);

    if (!emailResult.success) {
      console.error('Failed to send password reset email.');
      // Still return 200 to prevent email enumeration
    }

    return NextResponse.json(
      { message: 'If that email is registered, we have sent a reset link to it.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Forgot Password API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
