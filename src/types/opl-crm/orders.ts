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
