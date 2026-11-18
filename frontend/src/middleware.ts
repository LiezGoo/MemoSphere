import { NextRequest, NextResponse } from 'next/server';

const protectedPaths = ['/dashboard', '/my-diary', '/ai-diary', '/writing-modes', '/beneficiaries', '/legacy-policy', '/letter-of-wishes', '/activity-logs', '/settings', '/profile', '/vault', '/saved-information'];
const apiBaseUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) return NextResponse.next();

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
    if (response.ok) return NextResponse.next();
  } catch {
    // The client-side provider will show the same login redirect if the backend is unavailable.
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/my-diary/:path*', '/ai-diary/:path*', '/writing-modes/:path*', '/beneficiaries/:path*', '/legacy-policy/:path*', '/letter-of-wishes/:path*', '/activity-logs/:path*', '/settings/:path*', '/profile/:path*', '/vault/:path*', '/saved-information/:path*'],
};
