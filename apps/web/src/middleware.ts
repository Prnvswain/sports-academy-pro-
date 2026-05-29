import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/unauthorized', '/forbidden'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // FIXED: Use exact match for static public routes, or startsWith only for actual sub-routes
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const hasToken = request.cookies.has('access_token');

  // Bypass authentication checks for internal Next.js assets and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // If the user tries to access a protected route without a token, redirect them to login
  if (!isPublic && !hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox).*)'],
};
