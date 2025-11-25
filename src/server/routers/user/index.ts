// server/routers/user/index.ts
import { mergeRouters } from '@/server/trpc'
import { metricsRouter } from '../order/metrics'
import { adminUserRouter } from './admin'
import { authUserRouter } from './auth'
import { miscUserRouter } from './misc'
import { settingsRouter } from './settings'

export const userRouter = mergeRouters(
  authUserRouter,
  adminUserRouter,
  metricsRouter,
  miscUserRouter,
  settingsRouter
)
