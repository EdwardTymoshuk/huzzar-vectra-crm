// src/app/api/auth/[...nextauth]/route.ts

import { authOptions } from '@/lib/authOptions'
import NextAuth from 'next-auth'

console.log('[DEBUG] importing authOptions done')

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
