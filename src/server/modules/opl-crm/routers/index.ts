//src/server/modules/opl-crm/routers/index.ts

import { router } from '@/server/trpc'

import { orderRouter } from './order'
import { settingsRouter } from './settings'
import { userRouter } from './user'
import { warehouseRouter } from './warehouse'

// Combine all sub-routers into a single API router
export const oplRouter = router({
  warehouse: warehouseRouter,
  order: orderRouter,
  settings: settingsRouter,
  user: userRouter,
})

// Export the API router type for client-side usage
export type OplRouter = typeof oplRouter
