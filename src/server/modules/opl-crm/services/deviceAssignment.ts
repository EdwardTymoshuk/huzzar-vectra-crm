//src/server/moduels/opl-crm/services/deviceAssignment

import { DbTx } from '@/types'

export const validateDeviceUsage = async (
  tx: DbTx,
  params: {
    warehouseId: string
    technicianId: string
    isAdmin: boolean
  }
) => {
  const device = await tx.oplWarehouse.findUnique({
    where: { id: params.warehouseId },
    select: { id: true, status: true, assignedToId: true },
  })

  if (!device) throw new Error('DEVICE_NOT_FOUND')

  if (
    !params.isAdmin &&
    (device.assignedToId !== params.technicianId ||
      device.status !== 'ASSIGNED')
  ) {
    throw new Error('DEVICE_NOT_OWNED')
  }

  return device
}

export const assignDeviceToOrder = async (
  tx: DbTx,
  params: {
    warehouseId: string
    orderId: string
    performedById: string
  }
) => {
  await tx.oplOrderEquipment.create({
    data: {
      orderId: params.orderId,
      warehouseId: params.warehouseId,
    },
  })

  await tx.oplWarehouse.update({
    where: { id: params.warehouseId },
    data: {
      status: 'ASSIGNED_TO_ORDER',
      assignedToId: null,
      history: {
        create: {
          action: 'ASSIGNED_TO_ORDER',
          assignedOrderId: params.orderId,
          performedById: params.performedById,
          actionDate: new Date(),
        },
      },
    },
  })
}

export const removeDeviceFromOrder = async (
  tx: DbTx,
  params: {
    deviceId: string
    orderId: string
    performedById: string
  }
) => {
  const device = await tx.oplWarehouse.findUnique({
    where: { id: params.deviceId },
    select: {
      id: true,
      assignedToId: true,
    },
  })

  if (!device) throw new Error('DEVICE_NOT_FOUND')

  if (device.assignedToId) {
    // Return to technician stock
    await tx.oplWarehouse.update({
      where: { id: device.id },
      data: {
        status: 'ASSIGNED',
        assignedToId: device.assignedToId,
        history: {
          create: {
            action: 'RETURNED_TO_TECHNICIAN',
            assignedOrderId: params.orderId,
            performedById: params.performedById,
            actionDate: new Date(),
          },
        },
      },
    })
  } else {
    // Return to warehouse
    await tx.oplWarehouse.update({
      where: { id: device.id },
      data: {
        status: 'AVAILABLE',
        assignedToId: null,
        history: {
          create: {
            action: 'RETURNED',
            assignedOrderId: params.orderId,
            performedById: params.performedById,
            actionDate: new Date(),
          },
        },
      },
    })
  }
}
