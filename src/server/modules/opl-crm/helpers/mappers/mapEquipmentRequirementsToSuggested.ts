import { OplSuggestedEquipmentVM } from '@/types/opl-crm/orders'
import { OplDeviceCategory } from '@prisma/client'

/**
 * Maps order equipment requirements into UI-friendly suggested equipment VM.
 */
export const mapEquipmentRequirementsToSuggested = (
  requirements: {
    deviceDefinition: {
      id: string
      name: string
      category: OplDeviceCategory
    }
    quantity: number
  }[]
): OplSuggestedEquipmentVM[] => {
  return requirements.map((req) => ({
    deviceDefinitionId: req.deviceDefinition.id,
    name: req.deviceDefinition.name,
    category: req.deviceDefinition.category,
    quantity: req.quantity,
  }))
}
