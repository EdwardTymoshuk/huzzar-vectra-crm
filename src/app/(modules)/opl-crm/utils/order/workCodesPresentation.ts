import { oplActivationLabelMap } from '@/app/(modules)/opl-crm/lib/constants'
import { calculateDigAddons } from '@/app/(modules)/opl-crm/utils/order/calculateDigAddons'
import {
  ALL_BASE_CODES,
  ALL_ACTIVATION_CODES,
} from '@/app/(modules)/opl-crm/utils/order/completeOrderHelper'
import { DigInput, WorkCodePayload } from '@/types/opl-crm/orders'

const DIG_CODES = new Set(['ZJDD', 'ZJKD', 'ZJND'])
const BASE_CODES = new Set<string>(ALL_BASE_CODES)
const ACTIVATION_CODES = new Set<string>(ALL_ACTIVATION_CODES.map((a) => a.code))
const ALWAYS_WITH_QTY_CODES = new Set(['MR', 'ZJDD', 'ZJKD', 'ZJND'])

const activationOrder: Record<string, number> = {
  ZJWEW: 0,
  I_1P: 1,
  I_2P: 2,
  I_3P: 3,
  UTD: 4,
}

const isZjBaseCode = (code?: string): boolean =>
  code === 'ZJD' || code === 'ZJN' || code === 'ZJK'

const legacyCodeLabelMap: Record<string, string> = {
  // Legacy fallback seen in old settlements
  '51': 'ZJDD',
}

const getBucket = (code: string): number => {
  if (BASE_CODES.has(code)) return 0
  if (code === 'ZJWEW') return 1
  if (ACTIVATION_CODES.has(code)) return 2
  if (code === 'UMZ') return 4
  if (DIG_CODES.has(code)) return 5
  if (code.startsWith('PKI')) return 6
  return 3
}

export const toWorkCodeLabel = (code: string): string => {
  if (code in legacyCodeLabelMap) {
    return legacyCodeLabelMap[code]
  }
  if (code in oplActivationLabelMap) {
    return oplActivationLabelMap[code as keyof typeof oplActivationLabelMap]
  }
  return code
}

export const isPkiCode = (code: string): boolean => code.startsWith('PKI')

export const shouldShowWorkCodeQuantity = (
  code: string,
  quantity: number
): boolean => {
  if (quantity > 1) return true
  return ALWAYS_WITH_QTY_CODES.has(code)
}

export const buildOrderedWorkCodes = (
  value: WorkCodePayload[],
  digInput?: DigInput | null
): WorkCodePayload[] => {
  const baseWithoutDig = value.filter((v) => !DIG_CODES.has(v.code))
  const existingDig = value.filter((v) => DIG_CODES.has(v.code))
  const derivedDig = Object.entries(
    digInput ? calculateDigAddons(digInput) : {}
  ).map(([code, quantity]) => ({ code, quantity }))

  // Prefer derived DIG when DIG input is present; otherwise keep already selected DIG entries.
  const withDig = [
    ...baseWithoutDig,
    ...(digInput ? derivedDig : existingDig),
  ]

  const merged = new Map<string, number>()
  for (const item of withDig) {
    merged.set(item.code, (merged.get(item.code) ?? 0) + (item.quantity || 0))
  }

  const base = withDig.find((v) => BASE_CODES.has(v.code))?.code

  // ZJWEW is required in settlement/display for ZJ base family.
  if (isZjBaseCode(base) && !merged.has('ZJWEW')) {
    merged.set('ZJWEW', 1)
  }

  return Array.from(merged.entries())
    .map(([code, quantity]) => ({ code, quantity }))
    .sort((a, b) => {
      const bucketDiff = getBucket(a.code) - getBucket(b.code)
      if (bucketDiff !== 0) return bucketDiff

      if (getBucket(a.code) <= 2) {
        return (activationOrder[a.code] ?? 99) - (activationOrder[b.code] ?? 99)
      }

      return a.code.localeCompare(b.code)
    })
}
