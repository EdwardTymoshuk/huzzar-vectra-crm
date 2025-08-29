// src/middleware.ts
import type { Role, UserStatus } from '@prisma/client'
import { getToken, type JWT } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * App-specific JWT shape used across the middleware:
 * - We extend NextAuth's JWT with role/status coming from your DB.
 */
type AppJwt = JWT & {
  role?: Role
  status?: UserStatus
}

/**
 * Role-based route guard middleware for App Router.
 * - Ensures unauthenticated users are redirected to /login (except allowlist).
 * - Redirects ADMIN away from "/" to "/admin-panel".
 * - Blocks TECHNICIAN from accessing "/admin-panel".
 */
export async function middleware(req: NextRequest): Promise<Response> {
  // Read JWT from cookies using the same NEXTAUTH_SECRET as in API routes
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    // NOTE: When you later add HTTPS/SSL at Nginx, secure cookies are honored automatically
    secureCookie: process.env.NODE_ENV === 'production',
  })) as AppJwt | null

  const { pathname } = req.nextUrl

  // Public/static allowlist (auth endpoints, login, build assets, and common static files)
  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/img') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt)$/i.test(pathname)

  if (isPublic) return NextResponse.next()

  // Redirect unauthenticated users to /login preserving intended target
  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated branch below. Guard by role if present on the token.
  const userRole: Role | undefined = token?.role

  // ADMIN visiting "/" → send to /admin-panel
  if (userRole === 'ADMIN' && pathname === '/') {
    return NextResponse.redirect(new URL('/admin-panel', req.nextUrl.origin))
  }

  // TECHNICIAN cannot access /admin-panel
  if (userRole === 'TECHNICIAN' && pathname.startsWith('/admin-panel')) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }

  // Default: allow the request
  return NextResponse.next()
}

/**
 * Limit the middleware to all paths except Next.js internals and common static files.
 * This mirrors the allowlist above to avoid unnecessary invocation.
 */
export const config = {
  matcher: ['/((?!_next|api/auth|favicon.ico|static|img).*)'],
}
