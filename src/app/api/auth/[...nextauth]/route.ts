// src/app/api/auth/[...nextauth]/route.ts
import { getAuthOptions } from '@/lib/authOptions'
import NextAuth from 'next-auth'

const handler = async (req: Request) => {
  const authOptions = await getAuthOptions()
  return NextAuth(authOptions)(req)
}

export const GET = handler
export const POST = handler
