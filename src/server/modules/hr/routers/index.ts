//src/server/modules/vectra-crm/routers/index.ts

import { router } from '@/server/trpc'
import { hrUserRouter } from './user'

// Combine all sub-routers into a single API router
export const hrRouter = router({
  user: hrUserRouter,
})

// Export the API router type for client-side usage
export type StaffRouter = typeof hrRouter
