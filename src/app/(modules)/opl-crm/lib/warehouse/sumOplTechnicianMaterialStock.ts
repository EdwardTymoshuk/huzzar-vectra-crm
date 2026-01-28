import { OplWarehouse } from '@prisma/client'

/**
 * Returns total quantity of a given material assigned to a specific technician.
 * @param items - all warehouse items
 * @param technicianId - technician's user ID
 * @param materialName - name of the material to match
 * @returns number - total quantity assigned to the technician
 */
export function sumOplTechnicianMaterialStock(
  items: OplWarehouse[],
  technicianId: string,
  materialName: string
): number {
  return items
    .filter(
      (item) =>
        item.itemType === 'MATERIAL' &&
        item.assignedToId === technicianId &&
        item.name === materialName
    )
    .reduce((sum, item) => sum + (item.quantity || 0), 0)
}
