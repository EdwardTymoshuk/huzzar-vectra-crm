import { VectraActivatedService } from '@/types/vectra-crm'
import { VectraRateDefinition } from '@prisma/client'
import { mapServiceToCode } from '../lib/constants'

/**
 * Calculates the settlement work codes for a completed order.
 *
 * - Each NET service counts a socket for: modem + router (if any) + extra devices.
 * - TEL, DTV, ATV each count as one socket.
 * - ATV adds only socket (no device code).
 * - DTV and NET add both socket and their respective work codes.
 * - TEL adds only socket (no modem/install work code).
 * - "Przyłącze" is always added once.
 *
 * @param activatedServices - List of all activated services for the order.
 * @param rates - Array of available RateDefinitions (from the database).
 * @param install - Optional object { pion, listwa }.
 * @returns Array of { code, quantity } ready for settlement entries.
 */
export const getSettlementWorkCodes = (
  activatedServices: VectraActivatedService[],
  rates: VectraRateDefinition[],
  install?: { pion: number; listwa: number }
): { code: string; quantity: number }[] => {
  const workCodeMap: Record<string, number> = {}

  // Find matching codes
  const gniazdoCode =
    rates.find((r) => r.code.toLowerCase().includes('gniaz'))?.code || null
  const przylaczeCode =
    rates.find((r) => r.code.toLowerCase().includes('przył'))?.code || null

  /* -------------------- GNIAZDA (sockets) -------------------- */
  let gniazdoCount = 0

  activatedServices.forEach((service) => {
    if (service.type === 'NET') {
      // modem
      gniazdoCount += 1

      // router (if exists)
      if (service.deviceId2) gniazdoCount += 1

      // extra devices (e.g., extender)
      gniazdoCount += service.extraDevices?.length ?? 0
    } else {
      // TEL, DTV, ATV → each counts as one socket
      gniazdoCount += 1
    }
  })

  if (gniazdoCode && gniazdoCount > 0) {
    workCodeMap[gniazdoCode] = gniazdoCount
  }

  /* -------------------- PRZYŁĄCZE -------------------- */
  if (przylaczeCode) {
    workCodeMap[przylaczeCode] = 1
  }

  /* -------------------- DEVICE CODES (NET, DTV) -------------------- */
  activatedServices.forEach((service) => {
    if (service.type === 'ATV' || service.type === 'TEL') return // ATV/TEL add only socket

    const code = mapServiceToCode(service, rates)
    if (code) {
      workCodeMap[code] = (workCodeMap[code] || 0) + 1
    }
  })

  /* -------------------- INSTALL ELEMENTS -------------------- */
  if (install) {
    const pionCode =
      rates.find((r) => r.code.toLowerCase().includes('pion'))?.code || null
    if (pionCode && install.pion) {
      workCodeMap[pionCode] = Math.min(1, install.pion)
    }

    const listwaCode =
      rates.find((r) => r.code.toLowerCase().includes('listw'))?.code || null
    if (listwaCode && install.listwa) {
      workCodeMap[listwaCode] = install.listwa
    }
  }

  /* -------------------- RESULT -------------------- */
  return Object.entries(workCodeMap).map(([code, quantity]) => ({
    code,
    quantity,
  }))
}
