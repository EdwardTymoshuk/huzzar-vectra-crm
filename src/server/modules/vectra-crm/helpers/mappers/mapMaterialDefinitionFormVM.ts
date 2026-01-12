import { VectraMaterialDefinition, VectraMaterialUnit } from '@prisma/client'

export interface MaterialDefinitionFormVM {
  id: string
  name: string
  index: string
  unit: VectraMaterialUnit
  warningAlert: number
  alarmAlert: number
  price: number
}

export const mapMaterialDefinitionToForm = (
  m: VectraMaterialDefinition
): MaterialDefinitionFormVM => ({
  id: m.id,
  name: m.name,
  index: m.index ?? '',
  unit: m.unit ?? 'PIECE',
  price: m.price ?? 0,
  warningAlert: m.warningAlert ?? 10,
  alarmAlert: m.alarmAlert ?? 5,
})
