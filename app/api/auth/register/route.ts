import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { User, IUser } from '@/lib/models/User';
import bcrypt from 'bcryptjs';


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

    user.emailVerified = new Date();
    await user.save();

    return NextResponse.json(
      { message: 'User registered successfully. You can now log in.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
