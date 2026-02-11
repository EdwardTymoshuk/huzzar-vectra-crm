import { OplDeviceBasic } from '@/types/opl-crm'
import { OplDeviceCategory, OplWarehouseStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'

/**
 * Maps OplWarehouse DEVICE item into UI-safe OplDeviceBasic.
 * Throws if data is invalid (backend data corruption).
 */
export const mapWarehouseDeviceToBasic = (item: {
  id: string
  name: string
  serialNumber: string | null
  category: OplDeviceCategory | null
  status: OplWarehouseStatus
  deviceDefinitionId: string | null
}): OplDeviceBasic => {
  if (!item.serialNumber) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Warehouse device ${item.id} has no serial number`,
    })
  }

  if (!item.category) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Warehouse device ${item.id} has no category`,
    })
  }

  return {
    id: item.id,
    deviceDefinitionId: item.deviceDefinitionId,
    name: item.name,
    serialNumber: item.serialNumber,
    category: item.category,
    status: item.status,
  }
}
