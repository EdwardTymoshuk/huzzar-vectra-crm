// src/middleware
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const secret = process.env.NEXTAUTH_SECRET

/**
 * Middleware for role-based access control.
 * Redirects users based on their role and route access.
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret })
  const { pathname } = req.nextUrl

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

  // Redirect unauthenticated users to login
  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect admin users from "/" to "/admin-panel"
  if (token && token.role === 'ADMIN' && pathname === '/') {
    return NextResponse.redirect(new URL('/admin-panel', req.nextUrl.origin))
  }

  // Prevent technician users from accessing admin-panel
  if (
    token &&
    token.role === 'TECHNICIAN' &&
    pathname.startsWith('/admin-panel')
  ) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api/auth|favicon.ico|static|img).*)'],
}
