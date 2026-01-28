// src/server/routers/warehouse/queries.ts

// import { writeTechnicianStockReport } from '@/app/(modules)/opl-crm/utils/reports/warehouse/writeTechnicianStockReport'
// import { writeUsedMaterialsInstallationReport } from '@/app/(modules)/opl-crm/utils/reports/warehouse/writeUsedMaterialsInstallationReport'
// import { writeWarehouseStockReport } from '@/app/(modules)/opl-crm/utils/reports/warehouse/writeWarehouseStockReport'
import { writeOplTechnicianStockReport } from '@/app/(modules)/opl-crm/utils/reports/writeOplTechnicianStockReport'
import { writeOplUsedMaterialsInstallationReport } from '@/app/(modules)/opl-crm/utils/reports/writeOplUsedMaterialsInstallationReport'
import { writeOplWarehouseStockReport } from '@/app/(modules)/opl-crm/utils/reports/writeOplWarehouseStockReport'
import { writeOplReturnToOperatorReport } from '@/app/(modules)/opl-crm/utils/warehouse/writeOplReturnToOperatorReport'
import { adminCoordOrWarehouse } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { z } from 'zod'

export const reportsRouters = router({
  generateTechnicianStockReport: adminCoordOrWarehouse
    .input(z.object({ technicianId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const buffer = await writeOplTechnicianStockReport(input.technicianId)

      return buffer.toString('base64')
    }),

  generateWarehouseStockReport: adminCoordOrWarehouse
    .input(z.object({}).optional())
    .mutation(async () => {
      const buffer = await writeOplWarehouseStockReport()
      return buffer.toString('base64')
    }),

  generateOplReturnToOperatorReport: adminCoordOrWarehouse
    .input(z.object({ historyIds: z.array(z.string().uuid()) }))
    .mutation(async ({ input }) => {
      const buffer = await writeOplReturnToOperatorReport(input.historyIds)
      return buffer.toString('base64')
    }),
  generateUsedMaterialsInstallationReport: adminCoordOrWarehouse
    .input(
      z.object({
        year: z.number(),
        month: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = await writeOplUsedMaterialsInstallationReport(
        input.year,
        input.month
      )
      return buffer.toString('base64')
    }),
})
