// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getAuthOptions } from '@/lib/authOptions'
import NextAuth from 'next-auth'

// dynamic adapter import
const handler = async (
  req: Request,
  ctx: { params: Record<string, string> }
) => {
  const authOptions = await getAuthOptions()
  return NextAuth(authOptions)(req, ctx)
}

export { handler as GET, handler as POST }
