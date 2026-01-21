// src/proxy.ts
import type { Role, UserStatus } from '@prisma/client'
import { getToken, type JWT } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { MODULE_CODES } from './lib/constants'

/**
 * Extended JWT payload used by the application.
 */
type AppJwt = JWT & {
  id: string
  role: Role
  status: UserStatus
  modules: string[]
}

/**
 * Determines whether the request is effectively served over HTTPS.
 * Required when running behind a reverse proxy (e.g. Nginx).
 */
function isHttps(req: NextRequest): boolean {
  const xfProto = req.headers.get('x-forwarded-proto')
  const publicUrl = process.env.NEXTAUTH_URL ?? ''

  return xfProto === 'https' || publicUrl.startsWith('https://')
}

/**
 * Mapping of URL prefixes to required module codes.
 * Adding a new module requires only one entry here.
 */
const MODULE_PATH_MAP: Record<string, string> = {
  '/vectra-crm': MODULE_CODES.VECTRA,
  '/opl-crm': MODULE_CODES.OPL,
  '/hr': MODULE_CODES.HR,
}

/**
 * Global application proxy.
 * Executed for every incoming request matched by `config.matcher`.
 */
export default async function proxy(req: NextRequest): Promise<Response> {
  const { pathname } = req.nextUrl

  /**
   * Publicly accessible paths.
   */
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

  /**
   * Resolve session token.
   */
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isHttps(req),
  })) as AppJwt | null

  /**
   * Unauthenticated user → redirect to login.
   */
  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!token) {
    return NextResponse.next()
  }

  /**
   * Block inactive / suspended users.
   */
  if (token.status !== 'ACTIVE') {
    return NextResponse.redirect(new URL('/account-blocked', req.url))
  }

  /**
   * Module access control.
   * ADMIN has access to all modules.
   */
  const matchedModuleEntry = Object.entries(MODULE_PATH_MAP).find(([path]) =>
    pathname.startsWith(path)
  )

  if (matchedModuleEntry) {
    const [, requiredModule] = matchedModuleEntry

    if (token.role !== 'ADMIN' && !token.modules?.includes(requiredModule)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
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
