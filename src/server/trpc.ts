import { Context } from '@/types'
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'

/**
 * Create a typed tRPC instance with application context and superjson transformer.
 * This ensures support for Date, Map, Set and other native types.
 */
export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape
  },
})

/** Base router factory */
export const router = t.router

/** Public procedure (does not require authentication) */
export const publicProcedure = t.procedure
