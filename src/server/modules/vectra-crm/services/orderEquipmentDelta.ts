//src/server/modules/vectra-crm/services/orderEquipmentDelta.ts

import { DbTx } from '@/types'
import { VectraWarehouseStatus } from '@prisma/client'
import {
  assignDeviceToOrder,
  removeDeviceFromOrder,
  validateDeviceUsage,
} from './deviceAssignment'

/**
 * Unified equipment delta processor for COMPLETE, AMEND, and ADMIN EDIT.
 */
export type EquipmentDeltaMode = 'COMPLETE' | 'AMEND' | 'ADMIN'

interface ProcessEquipmentDeltaParams {
  tx: DbTx
  orderId: string
  newEquipmentIds: string[]
  technicianId: string | null
  editorId: string
  mode: EquipmentDeltaMode
}

interface PreviousDevice {
  id: string
}

export async function processEquipmentDelta({
  tx,
  orderId,
  newEquipmentIds,
  technicianId,
  editorId,
  mode,
}: ProcessEquipmentDeltaParams): Promise<void> {
  /* -------------------------------------------------------------------
   * STEP 1 — Load previously assigned equipment (DEVICE only)
   * ------------------------------------------------------------------- */
  const previous: PreviousDevice[] = await tx.vectraWarehouse.findMany({
    where: {
      itemType: 'DEVICE',
      orderAssignments: { some: { orderId } },
      status: { not: VectraWarehouseStatus.COLLECTED_FROM_CLIENT },
    },
    select: { id: true },
  })

  const prevIds = new Set(previous.map((d) => d.id))
  const nextIds = new Set(newEquipmentIds)

  const removed = [...prevIds].filter((id) => !nextIds.has(id))
  const added = [...nextIds].filter((id) => !prevIds.has(id))

  /* -------------------------------------------------------------------
   * STEP 2 — Rollback removed devices (safe & history-based)
   * ------------------------------------------------------------------- */
  for (const deviceId of removed) {
    await removeDeviceFromOrder(tx, {
      deviceId,
      orderId,
      performedById: editorId,
    })
  }

  /* -------------------------------------------------------------------
   * STEP 3 — Validate added devices usage
   * ------------------------------------------------------------------- */
  for (const deviceId of added) {
    await validateDeviceUsage(tx, {
      warehouseId: deviceId,
      technicianId: technicianId ?? '',
      isAdmin: mode === 'ADMIN',
    })
  }

  /* -------------------------------------------------------------------
   * STEP 4 — Assign added devices to order
   * ------------------------------------------------------------------- */
  for (const deviceId of added) {
    await assignDeviceToOrder(tx, {
      warehouseId: deviceId,
      orderId,
      performedById: editorId,
    })
  }
}
