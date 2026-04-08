import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/models/User';

/**
 * POST /api/auth/check-verified
 * Lightweight endpoint used only by the login page to distinguish
 * "wrong password" from "correct password but email not verified".
 *
 * Returns:
 *   200 — user exists and email is verified (or user doesn't exist — intentionally ambiguous)
 *   403 — user exists but emailVerified is null
 *
 * Deliberately does NOT reveal whether the email is registered
 * when the account is verified, to avoid user-enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('emailVerified')
      .lean();

    // If user doesn't exist or is already verified → return 200 (ambiguous)
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // User exists but hasn't verified their email
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 });
  } catch (error) {
    console.error('check-verified error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
