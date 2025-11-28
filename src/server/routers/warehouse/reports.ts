// src/server/routers/warehouse/queries.ts

import { adminOrCoord } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { writeTechnicianStockReport } from '@/utils/reports/warehouse/writeTechnicianStockReport'
import { writeWarehouseStockReport } from '@/utils/reports/warehouse/writeWarehouseStockReport'
import { z } from 'zod'

export const reportsRouters = router({
  /**
   * generateTechnicianStockReport
   * -----------------------------------------------------------
   * Generates a full Excel report with one sheet per technician,
   * listing all devices and materials assigned to each technician.
   * Access restricted to ADMIN users only.
   */
  generateTechnicianStockReport: adminOrCoord
    .input(z.object({ technicianId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const buffer = await writeTechnicianStockReport(input.technicianId)

      return buffer.toString('base64')
    }),

  generateWarehouseStockReport: adminOrCoord
    .input(z.object({}).optional())
    .mutation(async () => {
      const buffer = await writeWarehouseStockReport()
      return buffer.toString('base64')
    }),
})
