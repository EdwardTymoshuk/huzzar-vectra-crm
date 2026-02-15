import { timeSlotOptions } from '@/app/(modules)/vectra-crm/lib/constants'
import { oplTimeSlotOptions } from '@/app/(modules)/opl-crm/lib/constants'
import { OplTimeSlot, VectraTimeSlot } from '@prisma/client'

/**
 * Returns a human-readable time slot label based on the time slot enum value.
 *
 * @param slotValue - The time slot value (e.g., 'EIGHT_TEN')
 * @returns The corresponding label (e.g., '08:00 - 10:00') if found, or the raw value as fallback.
 */
export function getTimeSlotLabel(
  slotValue: VectraTimeSlot | OplTimeSlot
): string {
  const foundSlot = [...timeSlotOptions, ...oplTimeSlotOptions].find(
    (item) => item.value === slotValue
  )
  return foundSlot?.label ?? slotValue
}
