//src/server/routers/index.ts

import { router } from '../trpc'
import { orderRouter } from './order'
import { deviceDefinitionRouter } from './settings/deviceDefinitionRouter'
import { materialDefinitionRouter } from './settings/materialDefinitionRouter'
import { operatorDefinitionRouter } from './settings/operatorDefinitionRouter'
import { rateDefinitionRouter } from './settings/rateDefinition'
import { settlementRouter } from './settlement'
import { userRouter } from './user'
import { warehouseRouter } from './warehouse'

// Combine all sub-routers into a single API router
export const appRouter = router({
  user: userRouter,
  deviceDefinition: deviceDefinitionRouter,
  rateDefinition: rateDefinitionRouter,
  order: orderRouter,
  materialDefinition: materialDefinitionRouter,
  warehouse: warehouseRouter,
  operatorDefinition: operatorDefinitionRouter,
  settlement: settlementRouter,
})

// Export the API router type for client-side usage
export type AppRouter = typeof appRouter
