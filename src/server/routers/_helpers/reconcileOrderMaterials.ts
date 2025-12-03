// /server/routers/_helpers/reconcileOrderMaterials.ts

import { MaterialUnit, Prisma } from '@prisma/client'

type DbTx = Prisma.TransactionClient

export interface ReconcileMaterialInput {
  id: string
  quantity: number
}

/**
 * reconcileOrderMaterials
 * --------------------------------------------------------------------
 * Ensures full material stock synchronization when an order is edited.
 *
 * Steps:
 *   1. Load previous material usage from OrderMaterial.
 *   2. Restore old material quantities to the technician (including deficit rollback).
 *   3. Wipe previous OrderMaterial snapshot.
 *   4. Insert new OrderMaterial snapshot.
 *   5. Decrease technician stock based on new materials:
 *        • Positive stock is consumed first.
 *        • Missing part increases technicianMaterialDeficit.
 *   6. Create warehouseHistory entries for all material movements.
 *
 * The logic is shared by:
 *    - completeOrder
 *    - amendCompletion
 *    - adminEditCompletion
 *
 * This guarantees consistent and predictable inventory updates.
 */
export async function reconcileOrderMaterials({
  tx,
  orderId,
  technicianId,
  editorId,
  newMaterials,
}: {
  tx: DbTx
  orderId: string
  technicianId: string | null
  editorId: string
  newMaterials: ReconcileMaterialInput[]
}): Promise<{ warnings: string[] }> {
  const warnings: string[] = []

  if (!technicianId) {
    // Orders without technician assignment should not adjust material stock
    await tx.orderMaterial.deleteMany({ where: { orderId } })
    return { warnings }
  }

  // -----------------------------------------------------------
  // 1️⃣ Load previous material usage snapshot
  // -----------------------------------------------------------
  const previous = await tx.orderMaterial.findMany({
    where: { orderId },
    select: { materialId: true, quantity: true },
  })

  // -----------------------------------------------------------
  // 2️⃣ Restore previous usage to technician
  // -----------------------------------------------------------
  for (const prev of previous) {
    // Technician stock for this material
    const techItem = await tx.warehouse.findFirst({
      where: {
        materialDefinitionId: prev.materialId,
        assignedToId: technicianId,
        itemType: 'MATERIAL',
      },
    })

    // Technician deficit (if exists)
    const deficit = await tx.technicianMaterialDeficit.findUnique({
      where: {
        technicianId_materialDefinitionId: {
          technicianId,
          materialDefinitionId: prev.materialId,
        },
      },
    })

    // Case 1: technician had deficit earlier – reduce it first
    if (deficit && deficit.quantity > 0) {
      const reduce = Math.min(deficit.quantity, prev.quantity)

      await tx.technicianMaterialDeficit.update({
        where: {
          technicianId_materialDefinitionId: {
            technicianId,
            materialDefinitionId: prev.materialId,
          },
        },
        data: {
          quantity: { decrement: reduce },
        },
      })

      // If the whole previous usage was absorbed by deficit → nothing more to restore
      const remainingToRestore = prev.quantity - reduce
      if (remainingToRestore <= 0) {
        continue
      }

      // Continue restoring the remaining quantity to stock
      if (techItem) {
        await tx.warehouse.update({
          where: { id: techItem.id },
          data: { quantity: techItem.quantity + remainingToRestore },
        })

        await tx.warehouseHistory.create({
          data: {
            warehouseItemId: techItem.id,
            action: 'RETURNED_TO_TECHNICIAN',
            quantity: remainingToRestore,
            performedById: editorId,
            assignedOrderId: orderId,
            actionDate: new Date(),
          },
        })
      }

      continue
    }

    // Case 2: No deficit → material should be restored directly to stock
    if (techItem) {
      await tx.warehouse.update({
        where: { id: techItem.id },
        data: { quantity: techItem.quantity + prev.quantity },
      })

      await tx.warehouseHistory.create({
        data: {
          warehouseItemId: techItem.id,
          action: 'RETURNED_TO_TECHNICIAN',
          quantity: prev.quantity,
          performedById: editorId,
          assignedOrderId: orderId,
          actionDate: new Date(),
        },
      })
    }
  }

  // -----------------------------------------------------------
  // 3️⃣ Wipe previous snapshot
  // -----------------------------------------------------------
  await tx.orderMaterial.deleteMany({ where: { orderId } })

  // -----------------------------------------------------------
  // 4️⃣ Insert new materials snapshot
  // -----------------------------------------------------------
  if (newMaterials.length > 0) {
    const defs = await tx.materialDefinition.findMany({
      where: { id: { in: newMaterials.map((m) => m.id) } },
      select: { id: true, unit: true },
    })
    const unitMap = new Map(defs.map((d) => [d.id, d.unit]))

    await tx.orderMaterial.createMany({
      data: newMaterials.map((m) => ({
        orderId,
        materialId: m.id,
        quantity: m.quantity,
        unit: (unitMap.get(m.id) as MaterialUnit) ?? MaterialUnit.PIECE,
      })),
    })
  }

  // -----------------------------------------------------------
  // 5️⃣ Deduct NEW material usage from technician
  // -----------------------------------------------------------
  for (const item of newMaterials) {
    const techItem = await tx.warehouse.findFirst({
      where: {
        materialDefinitionId: item.id,
        assignedToId: technicianId,
        itemType: 'MATERIAL',
      },
    })

    const available = techItem?.quantity ?? 0
    const used = item.quantity

    const coveredFromStock = Math.min(available, used)
    const missing = used - coveredFromStock

    // Warnings for UI
    if (!techItem) {
      warnings.push(
        `Zużyto ${used} szt. materiału, którego nie masz na stanie.`
      )
    } else if (missing > 0) {
      warnings.push(
        `Zużyto ${used} szt., ale na stanie było tylko ${available}. Brakujące ${missing} szt. zostało zapisane jako niedobór.`
      )
    }

    // Decrease stock (coveredFromStock part)
    if (coveredFromStock > 0 && techItem) {
      await tx.warehouse.update({
        where: { id: techItem.id },
        data: { quantity: available - coveredFromStock },
      })

      await tx.warehouseHistory.create({
        data: {
          warehouseItemId: techItem.id,
          action: 'ASSIGNED_TO_ORDER',
          quantity: coveredFromStock,
          performedById: editorId,
          assignedOrderId: orderId,
          actionDate: new Date(),
        },
      })
    }

    // Increase technician deficit if material was missing
    if (missing > 0) {
      await tx.technicianMaterialDeficit.upsert({
        where: {
          technicianId_materialDefinitionId: {
            technicianId,
            materialDefinitionId: item.id,
          },
        },
        update: {
          quantity: { increment: missing },
        },
        create: {
          technicianId,
          materialDefinitionId: item.id,
          quantity: missing,
        },
      })
    }
  }

  return { warnings }
}
