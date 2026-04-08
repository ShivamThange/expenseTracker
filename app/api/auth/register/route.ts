import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { User, IUser } from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/lib/email/send';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = new User({
      name,
      email,
      passwordHash,
    }) as IUser;

    const rawToken = user.generateVerificationToken();
    await user.save();

    const emailResult = await sendVerificationEmail(user.email, user.name, rawToken);

    if (!emailResult.success) {
      // Clean up user if email fails, or let them request another validation email?
      // For now, let's keep the user but log the error
      console.error('Failed to send verification email during registration.');
    }

    return NextResponse.json(
      { message: 'User registered successfully. Please verify your email.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
