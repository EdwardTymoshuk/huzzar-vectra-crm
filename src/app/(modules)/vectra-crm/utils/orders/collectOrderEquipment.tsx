import { OrderWithDetails } from '@/app/(modules)/vectra-crm/components/orders/OrderDetailsContent'
import { devicesTypeMap } from '../../lib/constants'

/**
 * Builds a unified list of equipment used in an order.
 * Includes displayCategory for UI while keeping raw category key.
 */
export function collectOrderEquipment(order: OrderWithDetails) {
  const fromServices = order.services.flatMap((s) => {
    const items: {
      id: string
      name: string
      serial: string | null
      category: string | null
      displayCategory: string | null
      client: boolean
    }[] = []

    // Primary device
    if (s.deviceName && (s.type !== 'TEL' || s.serialNumber)) {
      const raw = s.deviceType ?? null
      items.push({
        id: `${s.id}-p`,
        name: s.deviceName,
        serial: s.serialNumber,
        category: raw,
        displayCategory: raw ? devicesTypeMap[raw] : null,
        client: s.deviceSource === 'CLIENT',
      })
    }

    // Secondary
    if (s.deviceName2) {
      const raw = s.deviceType2 ?? null
      items.push({
        id: `${s.id}-s`,
        name: s.deviceName2,
        serial: s.serialNumber2,
        category: raw,
        displayCategory: raw ? devicesTypeMap[raw] : null,
        client: false,
      })
    }

    // Extra devices
    if (s.extraDevices?.length) {
      s.extraDevices.forEach((ex) => {
        const raw = ex.category ?? null
        items.push({
          id: ex.id,
          name: ex.name ?? '',
          serial: ex.serialNumber ?? null,
          category: raw,
          displayCategory: raw ? devicesTypeMap[raw] : null,
          client: ex.source === 'CLIENT',
        })
      })
    }

    return items
  })

  const fromWarehouse =
    order.assignedEquipment
      ?.filter((e) =>
        e.warehouse.history.some((h) => h.action === 'ASSIGNED_TO_ORDER')
      )
      .map((item) => {
        const raw = item.warehouse.category ?? null
        return {
          id: item.id,
          name: item.warehouse.name,
          serial: item.warehouse.serialNumber,
          category: raw,
          displayCategory: raw ? devicesTypeMap[raw] : null,
          client: false,
        }
      }) ?? []

  // Merge + dedupe
  const merged = Object.values(
    [...fromServices, ...fromWarehouse].reduce((acc, item) => {
      const key = `${item.name}_${item.serial ?? ''}`.toLowerCase()
      if (!acc[key]) acc[key] = item
      return acc
    }, {} as Record<string, (typeof fromServices)[number]>)
  )

  return merged
}
