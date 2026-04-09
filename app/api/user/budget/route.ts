import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/models/User';

/**
 * GET /api/user/budget — returns the user's monthly budget
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id).select('monthlyBudget').lean();
  return NextResponse.json({ budget: (user as any)?.monthlyBudget ?? 0 });
}

/**
 * PATCH /api/user/budget — sets the user's monthly budget
 * Body: { budget: number }
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const budget = Number(body.budget);

  if (isNaN(budget) || budget < 0) {
    return NextResponse.json({ error: 'Budget must be a non-negative number' }, { status: 400 });
  }

  await connectToDatabase();
  await User.findByIdAndUpdate(session.user.id, { monthlyBudget: budget });

  return NextResponse.json({ budget });
}
