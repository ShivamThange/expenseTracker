import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';


export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if the user is authenticated via JWT
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;

  const isOnDashboard = pathname.startsWith('/dashboard');
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isOnDashboard && !isLoggedIn) {
    // Redirect unauthenticated users to login
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuthPage && isLoggedIn) {
    // Redirect authenticated users away from auth pages
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
