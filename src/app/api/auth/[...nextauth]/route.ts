// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getAuthOptions } from '@/lib/authOptions'
import NextAuth from 'next-auth'

const handler = async (req: Request): Promise<Response> => {
  const authOptions = await getAuthOptions()
  return NextAuth(authOptions)(req)
}

export { handler as GET, handler as POST }
