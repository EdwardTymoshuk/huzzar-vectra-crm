// server/routers/warehouse/index.ts

import { mergeRouters } from '@/server/trpc'
import { historyRouter } from './history'
import { locationTransferRouter } from './locationTransfer'
import { mutationsRouter } from './mutations'
import { queriesRouter } from './queries'
import { reportsRouters } from './reports'
import { warehouseTransferRouter } from './transfer'
// import { reportsRouters } from './reports'

export const warehouseRouter = mergeRouters(
  queriesRouter,
  locationTransferRouter,
  mutationsRouter,
  historyRouter,
  reportsRouters,
  warehouseTransferRouter
)
