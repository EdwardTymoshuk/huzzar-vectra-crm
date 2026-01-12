// src/server/routers/warehouse/queries.ts

import { adminCoordOrWarehouse, adminOrCoord } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { writeReturnToOperatorReport } from '@/utils/reports/warehouse/writeReturnToOperatorReport'
import { writeTechnicianStockReport } from '@/utils/reports/warehouse/writeTechnicianStockReport'
import { writeUsedMaterialsInstallationReport } from '@/utils/reports/warehouse/writeUsedMaterialsInstallationReport'
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

  generateReturnToOperatorReport: adminCoordOrWarehouse
    .input(z.object({ historyIds: z.array(z.string().uuid()) }))
    .mutation(async ({ input }) => {
      const buffer = await writeReturnToOperatorReport(input.historyIds)
      return buffer.toString('base64')
    }),

  generateUsedMaterialsInstallationReport: adminOrCoord
    .input(
      z.object({
        from: z.date(),
        to: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = await writeUsedMaterialsInstallationReport(
        input.from,
        input.to
      )

      return buffer.toString('base64')
    }),
})
