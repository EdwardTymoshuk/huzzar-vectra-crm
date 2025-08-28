// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getAuthOptions } from '@/lib/authOptions'
import NextAuth from 'next-auth'

const authOptions = await getAuthOptions()
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
