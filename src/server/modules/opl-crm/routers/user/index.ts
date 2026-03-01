// server/routers/user/index.ts
import { mergeRouters } from '@/server/trpc'
import { metricsRouter } from '../order/metrics'
import { adminUserRouter } from './admin'
import { absencesUserRouter } from './absences'
import { miscUserRouter } from './misc'
import { teamsUserRouter } from './teams'

export const userRouter = mergeRouters(
  adminUserRouter,
  absencesUserRouter,
  metricsRouter,
  miscUserRouter,
  teamsUserRouter
)
