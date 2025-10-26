import { DeviceCategory } from '@prisma/client'

/**
 * requiresMac
 * ----------------------------------
 * Utility function that determines whether a given device category
 * should use a MAC address instead of a standard serial number.
 * Used across forms like ServiceConfigDialog and AddDeviceDefinitionDialog.
 */
export const requiresMac = (category?: DeviceCategory): boolean => {
  if (!category) return false
  return (
    category === DeviceCategory.DECODER_2_WAY ||
    category === DeviceCategory.MODEM_HFC ||
    category === DeviceCategory.MODEM_GPON
  )
}
