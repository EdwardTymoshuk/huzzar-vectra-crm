// src/server/trpc

import { initTRPC } from '@trpc/server'
import superjson from 'superjson'

// Initialize tRPC with superjson for proper serialization of Date, Map, Set, etc.
const t = initTRPC.create({
  transformer: superjson,
})

// Create a base router
export const router = t.router

// Define public procedures (endpoints available to all users)
export const publicProcedure = t.procedure
