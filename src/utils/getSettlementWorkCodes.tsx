import { mapServiceToCode } from '@/lib/constants'
import { ActivatedService } from '@/types'
import { RateDefinition } from '@prisma/client'

/**
 * Calculates the settlement work codes for a completed order.
 *
 * - Each service (NET, TEL, DTV, ATV) counts as one socket ("Gniazdo").
 * - ATV is only counted as a socket, not as a device code.
 * - DTV (both 1-way and 2-way) counts as both a socket and a decoder code.
 * - NET and TEL count as both a socket and a NET/TEL code.
 * - "Przyłącze" is always added once.
 *
 * @param activatedServices - List of all activated services for the order.
 * @param rates - Array of available RateDefinitions (from the database).
 * @param install - Obiekt { pion: number, listwa: number } (opcjonalny).
 * @returns Array of objects: { code: string, quantity: number } ready for settlement.
 */
export const getSettlementWorkCodes = (
  activatedServices: ActivatedService[],
  rates: RateDefinition[],
  install?: { pion: number; listwa: number }
): { code: string; quantity: number }[] => {
  // Use a map to accumulate work code counts.
  const workCodeMap: Record<string, number> = {}

  // Find codes for "Gniazdo" (socket) and "Przyłącze" (connection).
  const gniazdoCode =
    rates.find((r) => r.code.toLowerCase().includes('gniaz'))?.code || null
  const przylaczeCode =
    rates.find((r) => r.code.toLowerCase().includes('przył'))?.code || null

  // Each service always adds one socket (even ATV)
  const gniazdoCount = activatedServices.length
  if (gniazdoCode && gniazdoCount) {
    workCodeMap[gniazdoCode] = gniazdoCount
  }

  // "Przyłącze" is always counted once per installation
  if (przylaczeCode) {
    workCodeMap[przylaczeCode] = 1
  }

  // Count work codes for NET, TEL, DTV (ATV adds only socket)
  activatedServices.forEach((service) => {
    if (service.type === 'ATV') {
      // ATV should only add a socket, skip separate code for ATV
      return
    }
    // Use helper to resolve proper work code for device
    const code = mapServiceToCode(service, rates)
    if (code) {
      workCodeMap[code] = (workCodeMap[code] || 0) + 1
    }
  })

  // Add PION and LISTWA if provided in install argument
  if (install) {
    const pionCode =
      rates.find((r) => r.code.toLowerCase().includes('pion'))?.code || null
    if (pionCode && install.pion) {
      workCodeMap[pionCode] = install.pion
    }
    const listwaCode =
      rates.find((r) => r.code.toLowerCase().includes('listw'))?.code || null
    if (listwaCode && install.listwa) {
      workCodeMap[listwaCode] = install.listwa
    }
  }

  // Return as an array of { code, quantity } for saving in settlement entries
  return Object.entries(workCodeMap).map(([code, quantity]) => ({
    code,
    quantity,
  }))
}
