// src/server/routers/index.ts

import { coreRouter } from '../core/routers'
import { hrRouter } from '../modules/hr/routers'
import { oplRouter } from '../modules/opl-crm/routers'
import { vectraRouter } from '../modules/vectra-crm/routers'
import { router } from '../trpc'

export const appRouter = router({
  core: coreRouter,
  vectra: vectraRouter,
  opl: oplRouter,
  hr: hrRouter,
})

export type AppRouter = typeof appRouter
