import { OplDeviceCategory } from '@prisma/client'
import { OplIssuedItemDevice } from '.'

// pkiTypes.ts
export type PkiItem = {
  code: string
  quantity: number
}

export type PkiCode =
  | 'PKI1'
  | 'PKI2'
  | 'PKI3'
  | 'PKI4'
  | 'PKI5'
  | 'PKI6'
  | 'PKI7'
  | 'PKI8'
  | 'PKI9'
  | 'PKI10'
  | 'PKI11'
  | 'PKI12'
  | 'PKI13'
  | 'PKI14'
  | 'PKI15'
  | 'PKI16'
  | 'PKI17'
  | 'PKI18'
  | 'PKI19'
  | 'PKI20'
  | 'PKI21'
  | 'PKI22'
  | 'PKI23'
  | 'PKI24'
  | 'PKI25'
  | 'PKI26'
  | 'PKI27'
  | 'PKI28'
  | 'PKI29'

export type DigInput =
  | { type: 'ZJD'; meters: number }
  | { type: 'ZJK'; meters: number }
  | { type: 'ZJN'; points: number }

export interface PkiDefinition {
  code: PkiCode
  label: string
}

export type OplCompletionResult = 'COMPLETED' | 'NOT_COMPLETED'

export interface OplCompleteOrderDraft {
  orderId: string

  /** Step: Status */
  completionResult: OplCompletionResult | null
  notes: string
  failureReason: string

  /** Step: Work codes (FINAL, mapped) */
  workCodes: {
    code: string
    quantity: number
  }[]

  /** Step: Materials */
  materials: {
    id: string
    quantity: number
  }[]

  /** Step: Collected devices */
  collected: {
    id: string
    name: string
    category: OplDeviceCategory
    serialNumber: string
  }[]

  /** Step: Issued devices */
  issued: OplIssuedItemDevice[]
}

export type WorkCodePayload = {
  code: string
  quantity: number
}

/**
 * Single equipment row draft used by both "issued" and "collected" flows.
 * Stored in wizard context as a stable, serializable form state.
 */
export type OplEquipmentDraftItem = {
  /** Stable client-side id used as React key and for updates/removals. */
  clientId: string

  /** Device definition identity (preferred for backend mapping). */
  deviceDefinitionId: string | null
  /** Source warehouse item id for issued device selection. */
  warehouseId?: string | null

  /** Display fields kept in state to avoid re-deriving UI when reopening dialog. */
  name: string
  category: OplDeviceCategory

  /** Optional serial entered by technician (can be required at submit-time). */
  serial: string
  /** UI-only label informing which technician stock this device came from. */
  sourceLabel?: string
}

/**
 * Generic draft for an equipment section (issued / collected).
 */
export type OplEquipmentSectionDraft = {
  /**
   * Whether the section is enabled by the user.
   * For "issued" this can be auto-enabled if suggestions exist.
   */
  enabled: boolean

  /**
   * When suggestions exist for "issued", user can skip the entire issuance flow.
   * Ignored when there are no suggestions (then enabled is driven by switch).
   */
  skip: boolean

  /** Draft rows. */
  items: OplEquipmentDraftItem[]
}

/**
 * Wizard equipment state (issued + collected).
 */
export type OplEquipmentDraft = {
  issued: OplEquipmentSectionDraft
  collected: OplEquipmentSectionDraft
}

/**
 * Lightweight suggested equipment row (from order requirements / assignments).
 */
export type OplSuggestedEquipmentVM = {
  deviceDefinitionId: string
  name: string
  category: OplDeviceCategory
  quantity: number
}
