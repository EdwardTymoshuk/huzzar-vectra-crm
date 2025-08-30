// src/middleware.ts
import type { Role, UserStatus } from '@prisma/client'
import { getToken, type JWT } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type AppJwt = JWT & { role?: Role; status?: UserStatus }

/**
 * Derive "secure cookie" mode from the real scheme:
 * - true only when we're effectively on HTTPS (public URL or proxy header)
 * - prevents "__Secure-" cookie lookup on plain HTTP
 */
function isHttps(req: NextRequest): boolean {
  const xfProto = req.headers.get('x-forwarded-proto')
  const publicUrl = process.env.NEXTAUTH_URL || ''
  return xfProto === 'https' || publicUrl.startsWith('https://')
}

export async function middleware(req: NextRequest): Promise<Response> {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isHttps(req), // 👈 KLUCZOWA ZMIANA: tylko na HTTPS
  })) as AppJwt | null

  const { pathname } = req.nextUrl

  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/img') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt)$/i.test(pathname)

  if (isPublic) return NextResponse.next()

  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const userRole: Role | undefined = token?.role

  if (userRole === 'ADMIN' && pathname === '/') {
    return NextResponse.redirect(new URL('/admin-panel', req.nextUrl.origin))
  }

  if (userRole === 'TECHNICIAN' && pathname.startsWith('/admin-panel')) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api/auth|favicon.ico|static|img).*)'],
}
