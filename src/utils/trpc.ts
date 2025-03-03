// src/utils/trpc.ts

import type { AppRouter } from '@/server/routers'
import { httpBatchLink } from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import { getSession } from 'next-auth/react'
import superjson from 'superjson'

/**
 * tRPC client configuration with superjson transformer and HTTP batch link.
 * Automatically attaches Authorization header if session token is available.
 */
export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
          async headers() {
            const session = await getSession()
            return {
              Authorization: session ? `Bearer ${session.user.id}` : '',
            }
          },
        }),
      ],
    }
  },
  ssr: false,
})
