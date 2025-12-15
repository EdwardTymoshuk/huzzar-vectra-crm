//src/server/routers/index.ts

import { router } from '../trpc'
import { orderRouter } from './vectra-crm/order'
import { settlementRouter } from './vectra-crm/reports/settlement'
import { deviceDefinitionRouter } from './vectra-crm/settings/deviceDefinitionRouter'
import { materialDefinitionRouter } from './vectra-crm/settings/materialDefinitionRouter'
import { operatorDefinitionRouter } from './vectra-crm/settings/operatorDefinitionRouter'
import { rateDefinitionRouter } from './vectra-crm/settings/rateDefinition'
import { userRouter } from './vectra-crm/user'
import { warehouseRouter } from './vectra-crm/warehouse'

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
