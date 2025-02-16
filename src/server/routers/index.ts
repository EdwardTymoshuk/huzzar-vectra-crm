import { router } from '../trpc'
import { userRouter } from './user'

// Combine all sub-routers into a single API router
export const appRouter = router({
  user: userRouter,
})

// Export the API router type for client-side usage
export type AppRouter = typeof appRouter
