// server/routers/user/index.ts
import { mergeRouters } from '@/server/trpc'
import { adminUserRouter } from './admin'
import { authUserRouter } from './auth'
import { metricsRouter } from './metrics'
import { miscUserRouter } from './misc'
import { settingsRouter } from './settings'

export const userRouter = mergeRouters(
  authUserRouter,
  adminUserRouter,
  metricsRouter,
  miscUserRouter,
  settingsRouter
)
