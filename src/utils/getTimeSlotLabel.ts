import { timeSlotOptions } from '@/lib/constants'
import { TimeSlot } from '@prisma/client'

/**
 * Returns a human-readable time slot label based on the time slot enum value.
 *
 * @param slotValue - The time slot value (e.g., 'EIGHT_TEN')
 * @returns The corresponding label (e.g., '08:00 - 10:00') if found, or the raw value as fallback.
 */
export function getTimeSlotLabel(slotValue: TimeSlot): string {
  const foundSlot = timeSlotOptions.find((item) => item.value === slotValue)
  return foundSlot?.label ?? slotValue
}
