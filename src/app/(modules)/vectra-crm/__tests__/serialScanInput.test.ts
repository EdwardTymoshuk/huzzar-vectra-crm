import { VectraDeviceCategory, VectraServiceType } from '@prisma/client'
import { describe, expect, test } from 'vitest'

// Kopia funkcji z twojego komponentu — nic nie zmieniamy
const makeIsAllowedForService = (
  serviceType: VectraServiceType,
  allowedCategories: VectraDeviceCategory[]
) => {
  return (device: { name: string; category?: VectraDeviceCategory }) => {
    if (!serviceType) return true

    const category = device.category
    const nameUpper = device.name?.toUpperCase() ?? ''

    switch (serviceType) {
      case 'NET':
        if (allowedCategories.includes(VectraDeviceCategory.OTHER)) {
          return (
            nameUpper.includes('EXTENDER') ||
            nameUpper.includes('REPEATER') ||
            nameUpper.includes('PLC') ||
            nameUpper.includes('EXT') ||
            category === VectraDeviceCategory.NETWORK_DEVICE
          )
        }

        return (
          category === VectraDeviceCategory.MODEM_HFC ||
          category === VectraDeviceCategory.MODEM_GPON
        )

      default:
        return true
    }
  }
}

describe('isAllowedForService – NET extra devices', () => {
  const serviceType = 'NET'

  test('NETWORK_DEVICE powinno być dozwolone jako extra device', () => {
    const isAllowed = makeIsAllowedForService(serviceType, [
      VectraDeviceCategory.OTHER,
    ])

    const device = {
      name: 'Ubiquiti Switch Flex',
      category: VectraDeviceCategory.NETWORK_DEVICE,
    }

    expect(isAllowed(device)).toBe(true)
  })

  test('EXTENDER powinien być dozwolony', () => {
    const isAllowed = makeIsAllowedForService(serviceType, [
      VectraDeviceCategory.OTHER,
    ])

    const device = {
      name: 'TP-Link WiFi Extender',
      category: VectraDeviceCategory.OTHER,
    }

    expect(isAllowed(device)).toBe(true)
  })

  test('Modem GPON nie powinien być traktowany jako extra device', () => {
    const isAllowed = makeIsAllowedForService(serviceType, [
      VectraDeviceCategory.OTHER,
    ])

    const device = {
      name: 'Modem GPON',
      category: VectraDeviceCategory.MODEM_GPON,
    }

    expect(isAllowed(device)).toBe(false)
  })

  test('Primary NET device mode: tylko HFC/GPON', () => {
    const isAllowed = makeIsAllowedForService(serviceType, []) // brak OTHER → primary mode

    expect(
      isAllowed({
        name: 'GPON modem',
        category: VectraDeviceCategory.MODEM_GPON,
      })
    ).toBe(true)

    expect(
      isAllowed({
        name: 'Extender',
        category: VectraDeviceCategory.OTHER,
      })
    ).toBe(false)
  })
})
