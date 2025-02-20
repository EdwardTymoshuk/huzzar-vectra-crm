import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const secret = process.env.NEXTAUTH_SECRET

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret })
  const { pathname } = req.nextUrl

  // Redirect to /login if the user is not authenticated and tries to access a protected route
  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname) // Remember the originally requested page
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users from /login to the home page
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

// Apply middleware to all routes except static files and API
export const config = {
  matcher: ['/((?!_next|api|static|favicon.ico).*)'],
}
