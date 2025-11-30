import { OrderWithDetails } from '@/app/components/shared/orders/OrderDetailsContent'

/**
 * Builds a unified list of equipment used in an order.
 * Merges:
 *  - equipment coming from activated services
 *  - equipment assigned from warehouse (ASSIGNED_TO_ORDER)
 * Deduplicates by (name + serial), preserves category and client source info.
 */
export function collectOrderEquipment(order: OrderWithDetails) {
  const fromServices = order.services.flatMap((s) => {
    const items: {
      id: string
      name: string
      serial: string | null
      category: string | null
      client: boolean
    }[] = []

    // Primary device (if applicable)
    if (s.deviceName && (s.type !== 'TEL' || s.serialNumber)) {
      items.push({
        id: `${s.id}-p`,
        name: s.deviceName,
        serial: s.serialNumber,
        category: s.deviceType ?? null,
        client: s.deviceSource === 'CLIENT',
      })
    }

    // Secondary device
    if (s.deviceName2) {
      items.push({
        id: `${s.id}-s`,
        name: s.deviceName2,
        serial: s.serialNumber2,
        category: s.deviceType2 ?? null,
        client: false,
      })
    }

    // Extra devices
    if (s.extraDevices?.length) {
      s.extraDevices.forEach((ex) => {
        items.push({
          id: ex.id,
          name: ex.name ?? '',
          serial: ex.serialNumber ?? null,
          category: ex.category ?? null,
          client: ex.source === 'CLIENT',
        })
      })
    }

    return items
  })

  // Equipment assigned from warehouse
  const fromWarehouse =
    order.assignedEquipment
      ?.filter((e) => e.warehouse.status === 'ASSIGNED_TO_ORDER')
      .map((item) => ({
        id: item.id,
        name: item.warehouse.name,
        serial: item.warehouse.serialNumber,
        category: item.warehouse.category ?? null,
        client: false,
      })) ?? []

  // MERGE + DEDUPE
  const merged = Object.values(
    [...fromServices, ...fromWarehouse].reduce((acc, item) => {
      const key = `${item.name}_${item.serial ?? ''}`.toLowerCase()
      if (!acc[key]) acc[key] = item
      return acc
    }, {} as Record<string, (typeof fromServices)[number]>)
  )

  return merged
}
