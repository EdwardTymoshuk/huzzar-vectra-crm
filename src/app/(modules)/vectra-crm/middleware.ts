import { prisma } from '@/utils/prisma'
import type { Role } from '@prisma/client'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * This middleware protects all routes inside /vectra-crm/**
 * It checks:
 *  - authentication
 *  - if user has Vectra module assignment (VectraUser exists)
 *  - optional Vectra role-based redirects
 */
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Allow public Next.js internal paths
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }

  // 1) Read JWT (global user)
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    // Not logged in → redirect to login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const coreUserId = token.sub // global User.id

  if (!coreUserId) {
    return NextResponse.redirect('/login')
  }

  // 2) Load vectra-crm user from DB
  const vectraUser = await prisma.vectraUser.findUnique({
    where: { userId: coreUserId },
    select: {
      userId: true,
      user: { select: { role: true, status: true } },
      // add more fields if needed
    },
  })

  // If user has no Vectra module → forbidden
  if (!vectraUser) {
    return NextResponse.redirect('/modules') // page with module selection
  }

  // If core user is inactive → block
  if (vectraUser.user.status !== 'ACTIVE') {
    return NextResponse.redirect('/account-suspended')
  }

  // 3) Role-based redirects inside VECTRA
  const role = vectraUser.user.role as Role

  // Technician → should not open admin panel
  if (role === 'TECHNICIAN' && pathname.startsWith('/vectra-crm/admin')) {
    return NextResponse.redirect(new URL('/vectra-crm', req.url))
  }

  // Warehouseman → redirect from "/" to their default tab
  if (role === 'WAREHOUSEMAN' && pathname === '/vectra-crm') {
    return NextResponse.redirect(new URL('/vectra-crm/warehouse', req.url))
  }

  // Admin → redirect to vectra-crm admin dashboard
  if (role === 'ADMIN' && pathname === '/vectra-crm') {
    return NextResponse.redirect(new URL('/vectra-crm/admin', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/vectra-crm/:path*'],
}
