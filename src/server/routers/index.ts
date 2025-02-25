import { router } from '../trpc'
import { deviceDefinitionRouter } from './deviceDefinition'
import { rateDefinitionRouter } from './rateDefinition'
import { userRouter } from './user'

// Combine all sub-routers into a single API router
export const appRouter = router({
  user: userRouter,
  deviceDefinition: deviceDefinitionRouter,
  rateDefinition: rateDefinitionRouter,
})

// Export the API router type for client-side usage
export type AppRouter = typeof appRouter
