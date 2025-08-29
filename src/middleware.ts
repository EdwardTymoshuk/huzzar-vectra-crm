// src/middleware.ts
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Ensure NEXTAUTH_SECRET is provided; secureCookie is true on HTTPS in prod.
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  })
  const { pathname } = req.nextUrl

  // Allowlist for public/static paths
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/img') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt)$/)
  ) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to /login
  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based redirects
  if (token && (token as any).role === 'ADMIN' && pathname === '/') {
    return NextResponse.redirect(new URL('/admin-panel', req.nextUrl.origin))
  }

  if (
    token &&
    (token as any).role === 'TECHNICIAN' &&
    pathname.startsWith('/admin-panel')
  ) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api/auth|favicon.ico|static|img).*)'],
}
