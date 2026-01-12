//src/server/modules/vectra-crm/services/orderServicesMapper.ts

import { DbTx } from '@/types'
import { VectraDeviceCategory, VectraServiceType } from '@prisma/client'

/**
 * Maps input services payload into database-ready service records.
 * - Resolves device categories from warehouse when deviceSource = WAREHOUSE
 * - Preserves client-provided device metadata
 */
export const mapServicesWithDeviceTypes = async (
  tx: DbTx,
  params: {
    services: {
      id: string
      type: VectraServiceType
      deviceId?: string
      deviceSource?: 'WAREHOUSE' | 'CLIENT'
      deviceName?: string
      deviceName2?: string
      deviceType?: VectraDeviceCategory | null
      serialNumber?: string
      deviceId2?: string
      serialNumber2?: string
      speedTest?: string
      usDbmDown?: number
      usDbmUp?: number
      notes?: string
      extraDevices?: {
        id: string
        source: 'WAREHOUSE' | 'CLIENT'
        category: VectraDeviceCategory
        name?: string
        serialNumber?: string
      }[]
    }[]
    orderId: string
  }
) => {
  const { services, orderId } = params

  return Promise.all(
    services.map(async (s) => {
      const [device1, device2] = await Promise.all([
        s.deviceSource === 'WAREHOUSE' && s.deviceId
          ? tx.vectraWarehouse.findUnique({
              where: { id: s.deviceId },
              select: { category: true },
            })
          : null,
        s.deviceId2
          ? tx.vectraWarehouse.findUnique({
              where: { id: s.deviceId2 },
              select: { category: true },
            })
          : null,
      ])

      return {
        id: s.id,
        orderId,
        type: s.type,

        deviceId: s.deviceId ?? null,
        serialNumber: s.serialNumber ?? null,
        deviceSource: s.deviceSource ?? null,
        deviceName: s.deviceName ?? null,
        deviceType:
          s.deviceSource === 'CLIENT'
            ? s.deviceType ?? null
            : device1?.category ?? null,

        deviceId2: s.deviceId2 ?? null,
        deviceName2: s.deviceName2 ?? null,
        serialNumber2: s.serialNumber2 ?? null,
        deviceType2: device2?.category ?? null,

        speedTest: s.speedTest ?? null,
        usDbmDown: s.usDbmDown ?? null,
        usDbmUp: s.usDbmUp ?? null,
        notes: s.notes ?? null,

        extraDevices:
          s.extraDevices?.map((ex) => ({
            id: ex.id,
            source: ex.source,
            category: ex.category,
            name: ex.name ?? null,
            serialNumber: ex.serialNumber ?? null,
          })) ?? [],
      }
    })
  )
}
