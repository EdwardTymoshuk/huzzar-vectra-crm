import { timeSlotOptions } from '@/lib/constants'
import { Operator, TimeSlot } from '@prisma/client'

/**
 * Returns a human-readable time slot label based on the specified operator and time slot enum value.
 *
 * @param operator - The operator in question (e.g., 'V' or 'MMP').
 * @param slotValue - The time slot value as defined by the Prisma enum (e.g., 'EIGHT_TEN').
 * @returns The corresponding label (e.g., '08:00 - 10:00') if found, or the original value as a fallback.
 */
export function getTimeSlotLabel(
  operator: Operator,
  slotValue: TimeSlot
): string {
  // Get the array of time slot objects for the given operator, e.g. timeSlotOptions['V'] or timeSlotOptions['MMP']
  const slotsForOperator = timeSlotOptions[operator]

  // If there's no matching operator in timeSlotOptions, return the raw value as a fallback
  if (!slotsForOperator) {
    return slotValue
  }

  // Find the object whose 'value' matches the slotValue, e.g. { value: 'EIGHT_TEN', label: '08:00 - 10:00' }
  const foundSlot = slotsForOperator.find((item) => item.value === slotValue)

  // Return the label if found; otherwise, return the raw value
  return foundSlot ? foundSlot.label : slotValue
}
