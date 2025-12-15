import { VectraDeviceCategory } from '@prisma/client'

/**
 * requiresMac
 * ----------------------------------
 * Utility function that determines whether a given device category
 * should use a MAC address instead of a standard serial number.
 * Used across forms like ServiceConfigDialog and AddDeviceDefinitionDialog.
 */
export const requiresMac = (category?: VectraDeviceCategory): boolean => {
  if (!category) return false
  return (
    category === VectraDeviceCategory.DECODER_2_WAY ||
    category === VectraDeviceCategory.MODEM_HFC ||
    category === VectraDeviceCategory.MODEM_GPON
  )
}
