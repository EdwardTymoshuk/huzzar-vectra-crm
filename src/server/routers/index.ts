// src/server/routers/index.ts

import { coreRouter } from '../core/routers'
import { hrRouter } from '../modules/hr/routers'
import { vectraRouter } from '../modules/vectra-crm/routers'
import { router } from '../trpc'

export const appRouter = router({
  vectra: vectraRouter,
  core: coreRouter,
  hr: hrRouter,
})

export type AppRouter = typeof appRouter
