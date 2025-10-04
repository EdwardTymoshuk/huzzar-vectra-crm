// server/routers/warehouse/index.ts

import { mergeRouters } from '@/server/trpc'
import { historyRouter } from './history'
import { locationTransferRouter } from './locationTransfer'
import { mutationsRouter } from './mutations'
import { queriesRouter } from './queries'
import { warehouseTransferRouter } from './transfer'

export const warehouseRouter = mergeRouters(
  queriesRouter,
  mutationsRouter,
  historyRouter,
  warehouseTransferRouter,
  locationTransferRouter
)
