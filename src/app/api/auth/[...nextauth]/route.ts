// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getAuthOptions } from '@/lib/authOptions'
import NextAuth from 'next-auth'

const handler = async () => {
  const authOptions = await getAuthOptions()
  return NextAuth(authOptions)
}

const authHandler = await handler()

export { authHandler as GET, authHandler as POST }
