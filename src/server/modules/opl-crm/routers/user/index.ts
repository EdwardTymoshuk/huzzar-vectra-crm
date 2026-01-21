// server/routers/user/index.ts
import { mergeRouters } from '@/server/trpc'
import { metricsRouter } from '../order/metrics'
import { adminUserRouter } from './admin'
import { miscUserRouter } from './misc'

export const userRouter = mergeRouters(
  adminUserRouter,
  metricsRouter,
  miscUserRouter
)
