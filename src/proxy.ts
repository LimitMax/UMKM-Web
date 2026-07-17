import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Phase 15A — Route Protection Proxy (Next.js 16)
 *
 * This is a lightweight FIRST-LAYER defense that checks for the presence
 * of a Supabase session cookie. Full role-level authorization is enforced
 * by the layout-level guards (second layer) after the auth context loads.
 *
 * Renamed from middleware.ts to proxy.ts per Next.js 16 convention.
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 */

function hasSessionCookie(request: NextRequest): boolean {
  const cookieHeader = request.headers.get('cookie') || '';
  // Supabase client v2 stores session as sb-<ref>-auth-token
  return (
    cookieHeader.includes('-auth-token') ||
    cookieHeader.includes('supabase-auth-token')
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /platform/** routes ──────────────────────────────────────────────────
  // Public: /platform/login
  if (pathname === '/platform/login' || pathname === '/platform/login/') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/platform/')) {
    // No session cookie → redirect to platform login
    if (!hasSessionCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/platform/login';
      return NextResponse.redirect(loginUrl);
    }
    // Session present → allow through (layout handles role check)
    return NextResponse.next();
  }

  // ── /admin/** routes ─────────────────────────────────────────────────────
  if (pathname.startsWith('/admin/') || pathname === '/admin') {
    if (!hasSessionCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── /cashier/** routes ───────────────────────────────────────────────────
  if (pathname.startsWith('/cashier/') || pathname === '/cashier') {
    if (!hasSessionCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/platform/:path*',
    '/admin/:path*',
    '/admin',
    '/cashier/:path*',
    '/cashier',
  ],
};
