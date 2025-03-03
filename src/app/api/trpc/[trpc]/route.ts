import { createContext } from './../../../../server/middleware'
// src/app/api/trpc/[trpc]/route.ts

import { appRouter } from '@/server/routers'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

// Export API handler
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  })

export { handler as GET, handler as POST }
