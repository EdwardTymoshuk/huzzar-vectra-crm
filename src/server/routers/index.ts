import { router } from '../trpc'
import { deviceDefinitionRouter } from './deviceDefinitionRouter'
import { materialDefinitionRouter } from './materialDefinitionRouter'
import { operatorDefinitionRouter } from './operatorDefinitionRouter'
import { orderRouter } from './orderRouter'
import { rateDefinitionRouter } from './rateDefinition'
import { userRouter } from './user'
import { warehouseRouter } from './warehouseRouter'

// Combine all sub-routers into a single API router
export const appRouter = router({
  user: userRouter,
  deviceDefinition: deviceDefinitionRouter,
  rateDefinition: rateDefinitionRouter,
  order: orderRouter,
  materialDefinition: materialDefinitionRouter,
  warehouse: warehouseRouter,
  operatorDefinition: operatorDefinitionRouter,
})

// Export the API router type for client-side usage
export type AppRouter = typeof appRouter
