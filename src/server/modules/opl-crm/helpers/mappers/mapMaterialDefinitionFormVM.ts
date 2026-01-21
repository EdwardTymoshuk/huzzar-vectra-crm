import { OplMaterialDefinition, OplMaterialUnit } from '@prisma/client'

export interface MaterialDefinitionFormVM {
  id: string
  name: string
  index: string
  unit: OplMaterialUnit
  warningAlert: number
  alarmAlert: number
  price: number
}

export const mapMaterialDefinitionToForm = (
  m: OplMaterialDefinition
): MaterialDefinitionFormVM => ({
  id: m.id,
  name: m.name,
  index: m.index ?? '',
  unit: m.unit ?? 'PIECE',
  price: m.price ?? 0,
  warningAlert: m.warningAlert ?? 10,
  alarmAlert: m.alarmAlert ?? 5,
})
