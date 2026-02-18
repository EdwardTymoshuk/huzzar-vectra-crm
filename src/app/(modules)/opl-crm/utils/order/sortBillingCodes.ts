import { toWorkCodeLabel } from './workCodesPresentation'

export const OPL_BILLING_VISIBLE_CODES = [
  'W1',
  'W2',
  'W3',
  'W4',
  'W5',
  'ZJD',
  'ZJN',
  'ZJWEW',
  '1P',
  '2P',
  '3P',
  'UMZ',
  'MR',
  'ZJDD',
  'ZJND',
  'P1P',
  'P2P',
  'P3P',
  'DU',
] as const

export const OPL_SERVICE_VISIBLE_CODES = [
  'N-FTTH',
  'N-ZA',
  'NP-FTTH',
  'OZA',
  'SPLIT32',
  'SPLIT64',
  'PKU1',
  'PKU2',
  'PKU3',
] as const

const BASE_ORDER = [
  'W1',
  'W2',
  'W3',
  'W4',
  'W5',
  'W6',
  'WGH',
  'ZJD',
  'ZJN',
  'ZJK',
  'ZJDEW',
  'DU',
]

const ACTIVATION_ORDER = ['ZJWEW', '1P', '2P', '3P', 'UTD']
const SPECIAL_ORDER = ['UMZ', 'MR', 'ZJDD', 'ZJND', 'ZJKD']

const baseIndex = new Map(BASE_ORDER.map((code, index) => [code, index]))
const activationIndex = new Map(
  ACTIVATION_ORDER.map((code, index) => [code, index])
)
const specialIndex = new Map(SPECIAL_ORDER.map((code, index) => [code, index]))

const getBucket = (code: string): number => {
  if (baseIndex.has(code)) return 0
  if (activationIndex.has(code)) return 1
  if (specialIndex.has(code)) return 2
  if (code.startsWith('PKI')) return 4
  return 3
}

/**
 * Sort OPL settlement codes in business-friendly order:
 * base -> activation -> addons -> misc -> PKI.
 */
export const sortBillingCodes = (codes: string[]): string[] => {
  const unique = Array.from(new Set(codes.map((code) => code.trim()))).filter(
    Boolean
  )

  return unique.sort((left, right) => {
    const leftBucket = getBucket(left)
    const rightBucket = getBucket(right)

    if (leftBucket !== rightBucket) {
      return leftBucket - rightBucket
    }

    if (leftBucket === 0) {
      return (baseIndex.get(left) ?? 999) - (baseIndex.get(right) ?? 999)
    }
    if (leftBucket === 1) {
      return (
        (activationIndex.get(left) ?? 999) - (activationIndex.get(right) ?? 999)
      )
    }
    if (leftBucket === 2) {
      return (specialIndex.get(left) ?? 999) - (specialIndex.get(right) ?? 999)
    }

    if (leftBucket === 4) {
      const leftNumber = Number(left.replace('PKI', ''))
      const rightNumber = Number(right.replace('PKI', ''))
      return leftNumber - rightNumber
    }

    return toWorkCodeLabel(left).localeCompare(toWorkCodeLabel(right), 'pl')
  })
}

export const formatBillingQuantity = (value: number): string => {
  const rounded = Math.round(value * 100) / 100
  if (Math.abs(rounded - Math.trunc(rounded)) < 0.001) {
    return String(Math.trunc(rounded))
  }
  return rounded.toFixed(2).replace('.', ',')
}

/**
 * UI-visible settlement columns for OPL billing pages.
 * Backend still calculates all codes; this only limits display.
 */
export const getVisibleBillingCodes = (allCodes: string[]): string[] => {
  const set = new Set(allCodes.map((code) => code.trim().toUpperCase()))
  return OPL_BILLING_VISIBLE_CODES.filter((code) => set.has(code))
}

export const getVisibleServiceBillingCodes = (allCodes: string[]): string[] => {
  const set = new Set(allCodes.map((code) => code.trim().toUpperCase()))
  return OPL_SERVICE_VISIBLE_CODES.filter((code) => set.has(code))
}
