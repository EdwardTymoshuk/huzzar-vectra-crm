import { timeSlotOptions } from '@/app/(modules)/vectra-crm/lib/constants'
import { VectraTimeSlot } from '@prisma/client'

/**
 * Returns a human-readable time slot label based on the time slot enum value.
 *
 * @param slotValue - The time slot value (e.g., 'EIGHT_TEN')
 * @returns The corresponding label (e.g., '08:00 - 10:00') if found, or the raw value as fallback.
 */
export function getTimeSlotLabel(slotValue: VectraTimeSlot): string {
  const foundSlot = timeSlotOptions.find((item) => item.value === slotValue)
  return foundSlot?.label ?? slotValue
}
