import { ActivationPrimaryItem, PrimaryAddonCode } from '@/types/opl-crm'
import {
  OplActivationType,
  OplBaseWorkCode,
  OplOrderStandard,
} from '@prisma/client'

export const ALL_BASE_CODES: OplBaseWorkCode[] = [
  'ZJD',
  'ZJDEW',
  'ZJN',
  'ZJK',

  'W1',
  'W2',
  'W3',
  'W4',
  'W5',
  'W6',

  'DU',
  'P1P',
  'P2P',
  'P3P',
  'PUTD',
]

export const ALL_ACTIVATION_CODES: ActivationPrimaryItem[] = [
  { code: 'ZJWEW', auto: true },

  { code: 'I_1P', auto: false },
  { code: 'I_2P', auto: false },
  { code: 'I_3P', auto: false },

  { code: 'UTD', auto: false },
]

export const ALL_ADDON_CODES: PrimaryAddonCode[] = [
  // ZJ-related (auto)
  'ZJDD',
  'ZJND',
  'ZJKD',

  // Manual complexity
  'MR',
  'UMZ',

  // Equipment / services
  'DMR',
  'DTV',
  'DDSD',
  'DMOD',

  // Network
  'KUK',
  'DAFP',
  'DAFN',

  // Special
  'IKDD',
]

/**
 * Returns 4 primary base work codes depending on order standard.
 * Always ordered for optimal technician UX.
 */
export const getPrimaryBaseCodes = (
  standard?: OplOrderStandard
): OplBaseWorkCode[] => {
  if (!standard) return ['DU', 'P1P', 'P2P', 'P3P']

  if (standard.startsWith('ZJD')) return ['ZJD', 'ZJDEW', 'W4', 'ZJN']
  if (standard.startsWith('ZJN')) return ['ZJN', 'ZJDEW', 'W4', 'ZJD']
  if (standard.startsWith('ZJK')) return ['ZJK', 'ZJDEW', 'W4', 'ZJD']

  if (standard === 'W1' || standard === 'W2' || standard === 'W3')
    return [standard as OplBaseWorkCode, 'W4', 'ZJD', 'ZJN']

  if (/^W[4-6]$/.test(standard))
    return [standard as OplBaseWorkCode, 'ZJD', 'ZJDEW', 'ZJN']

  return ['DU', 'P1P', 'P2P', 'P3P']
}

/**
 * Returns primary activation codes (always 4 slots).
 * ZJWEW is auto-added (non-removable) for ZJ family.
 */
export const getPrimaryActivationCodes = (
  base: OplBaseWorkCode | undefined
): ActivationPrimaryItem[] => {
  const isZj = base === 'ZJD' || base === 'ZJN' || base === 'ZJK'

  const items: ActivationPrimaryItem[] = []

  if (isZj) {
    items.push({ code: 'ZJWEW', auto: true })
  }

  items.push(
    { code: 'I_1P', auto: false },
    { code: 'I_2P', auto: false },
    { code: 'I_3P', auto: false }
  )

  return items
}

/**
 * Returns exactly 4 primary addon codes based on business rules.
 * Service-only orders (DTV / DMR) allow MR even without installation base.
 */
export const getPrimaryAddonCodes = (
  base: OplBaseWorkCode | undefined,
  activation: OplActivationType | undefined,
  allAddons: PrimaryAddonCode[],
  serviceOnly: boolean
): PrimaryAddonCode[] => {
  const primary: PrimaryAddonCode[] = []

  const push = (code: PrimaryAddonCode) => {
    if (!primary.includes(code)) {
      primary.push(code)
    }
  }

  /* -------------------- BASE PRIMARY RULES -------------------- */

  // UMZ is always primary
  push('UMZ')

  // MR rules:
  // - 3P activation
  // - P3P installation
  // - DU service
  // - service-only orders (DTV / DMR)
  const mrAllowed =
    activation === 'I_3P' || base === 'P3P' || base === 'DU' || serviceOnly

  if (mrAllowed) {
    push('MR')
  }

  // Service / equipment addons
  push('DMR')
  push('DTV')

  // Network addon
  push('KUK')

  // ZJD-specific addons
  if (base === 'ZJD') {
    push('DAFP')
    push('DAFN')
  }

  /* -------------------- EXCLUDE DIG ADDONS -------------------- */

  const isDigAddon = (code: PrimaryAddonCode) =>
    code === 'ZJDD' || code === 'ZJND' || code === 'ZJKD'

  const filtered = primary.filter((c) => !isDigAddon(c))

  /* -------------------- ENSURE EXACTLY 4 -------------------- */

  if (filtered.length >= 4) {
    return filtered.slice(0, 4)
  }

  for (const code of allAddons) {
    if (filtered.length >= 4) break
    if (isDigAddon(code)) continue
    if (!filtered.includes(code)) {
      filtered.push(code)
    }
  }

  return filtered
}
