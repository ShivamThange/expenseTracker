import { auth } from './lib/auth/auth';
import { NextRequest, NextResponse } from 'next/server';

export default auth((req) => {
  // req.auth contains the session if the user is logged in
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
