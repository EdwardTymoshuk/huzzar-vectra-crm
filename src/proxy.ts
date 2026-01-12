// src/proxy.ts
import type { Role, UserStatus } from '@prisma/client'
import { getToken, type JWT } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type AppJwt = JWT & {
  id: string
  role: Role
  status: UserStatus
  modules: string[]
}

/**
 * Determines whether the request is effectively served over HTTPS.
 * This is required to correctly resolve secure cookies when running
 * behind a reverse proxy (e.g. VPS + Nginx).
 */
function isHttps(req: NextRequest): boolean {
  const xfProto = req.headers.get('x-forwarded-proto')
  const publicUrl = process.env.NEXTAUTH_URL ?? ''

  return xfProto === 'https' || publicUrl.startsWith('https://')
}

/**
 * Global application proxy.
 * Executed for every incoming request matched by `config.matcher`.
 */
export default async function proxy(req: NextRequest): Promise<Response> {
  const { pathname } = req.nextUrl

  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/img') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt)$/i.test(pathname)

  if (isPublic) {
    return NextResponse.next()
  }

  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isHttps(req),
  })) as AppJwt | null

  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!token) {
    return NextResponse.next()
  }

  if (token.status !== 'ACTIVE') {
    return NextResponse.redirect(new URL('/account-blocked', req.url))
  }

  if (
    pathname.startsWith('/vectra-crm') &&
    token.role !== 'ADMIN' &&
    !token.modules?.includes('VECTRA_CRM')
  ) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

/**
 * Proxy execution scope.
 * Excludes static assets and Next.js internals.
 */
export const config = {
  matcher: ['/((?!_next|api/auth|favicon.ico|static|img).*)'],
}
