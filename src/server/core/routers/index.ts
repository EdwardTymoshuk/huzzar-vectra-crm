// src/server/core/routers/index.ts

import { router } from '@/server/trpc'
import { userCoreRouter } from './user'

export const coreRouter = router({
  user: userCoreRouter,
})

export type CoreRouter = typeof coreRouter
