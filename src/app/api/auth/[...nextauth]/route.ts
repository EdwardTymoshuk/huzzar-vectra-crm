// Force Node runtime for NextAuth v4 (Edge is not supported here).
export const runtime = 'nodejs'

import { authOptions } from '@/lib/authOptions'
import NextAuth from 'next-auth'

/**
 * NextAuth handler for App Router (v4):
 * - Must run in Node runtime.
 * - Expose the same handler for GET and POST.
 * - Add minimal diagnostics to confirm adapter/providers presence.
 */
console.log('[AUTH:init]', {
  node: process.version,
  hasProviders:
    Array.isArray(authOptions.providers) && authOptions.providers.length > 0,
  hasAdapter: Boolean(authOptions.adapter),
})

const authHandler = NextAuth(authOptions)

export { authHandler as GET, authHandler as POST }
