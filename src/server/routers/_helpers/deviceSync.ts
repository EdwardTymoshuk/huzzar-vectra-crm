import { TRPCError } from '@trpc/server'
import { DbTx } from './../../../types/index'

/**
 * Validates if technician is allowed to use given warehouse device.
 * Technician may use ONLY devices assigned to him (status = ASSIGNED).
 * Admin may use any device from technician or warehouse.
 */
export async function validateDeviceOwnership(
  tx: DbTx,
  warehouseId: string,
  technicianId: string,
  isAdmin: boolean
) {
  const device = await tx.warehouse.findUnique({
    where: { id: warehouseId },
    select: {
      id: true,
      status: true,
      assignedToId: true,
    },
  })

  if (!device) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Warehouse item not found.',
    })
  }

  // Technician logic — strict
  if (!isAdmin) {
    if (device.assignedToId !== technicianId || device.status !== 'ASSIGNED') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this device.',
      })
    }
  }

  return device
}

/**
 * Assigns device to order and moves into ASSIGNED_TO_ORDER state.
 * Device leaves technician's stock and becomes "client-owned".
 */
export async function syncDeviceOnAdd(
  tx: DbTx,
  warehouseId: string,
  orderId: string,
  performedById: string
) {
  // Create logical link device ↔ order
  await tx.orderEquipment.create({
    data: {
      orderId,
      warehouseId,
    },
  })

  // Update warehouse status to reflect device usage
  await tx.warehouse.update({
    where: { id: warehouseId },
    data: {
      status: 'ASSIGNED_TO_ORDER',
      assignedToId: null,
      history: {
        create: {
          action: 'ASSIGNED_TO_ORDER',
          assignedOrderId: orderId,
          performedById,
          actionDate: new Date(),
        },
      },
    },
  })
}

/**
 * Removes device from order.
 * If device originally belonged to technician → return to technician.
 * If device originated from warehouse/admin → return to warehouse.
 */
export async function syncDeviceOnRemove(
  tx: DbTx,
  device: { id: string; assignedToId: string | null; locationId: string },
  orderId: string,
  performedById: string
) {
  if (device.assignedToId) {
    // Return to technician's personal stock
    await tx.warehouse.update({
      where: { id: device.id },
      data: {
        status: 'ASSIGNED',
        assignedToId: device.assignedToId,
        history: {
          create: {
            action: 'RETURNED_TO_TECHNICIAN',
            assignedToId: device.assignedToId,
            assignedOrderId: orderId,
            performedById,
            actionDate: new Date(),
          },
        },
      },
    })
  } else {
    // Return to warehouse stock
    await tx.warehouse.update({
      where: { id: device.id },
      data: {
        status: 'AVAILABLE',
        assignedToId: null,
        history: {
          create: {
            action: 'RETURNED',
            assignedOrderId: orderId,
            performedById,
            actionDate: new Date(),
          },
        },
      },
    })
  }
}
