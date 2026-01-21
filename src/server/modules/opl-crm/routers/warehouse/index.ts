// server/routers/warehouse/index.ts

import { mergeRouters } from '@/server/trpc'
import { locationTransferRouter } from './locationTransfer'
import { mutationsRouter } from './mutations'
import { queriesRouter } from './queries'
// import { reportsRouters } from './reports'

export const warehouseRouter = mergeRouters(
  queriesRouter,
  locationTransferRouter,
  mutationsRouter
  // reportsRouters
)
