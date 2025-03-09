// src/lib/constants.ts

import { MenuItem } from '@/types'
import { Operator, TimeSlot } from '@prisma/client'
import {
  MdAssignment,
  MdOutlineSettings,
  MdPeopleAlt,
  MdReceiptLong,
  MdSpaceDashboard,
  MdWarehouse,
} from 'react-icons/md'

/**
 * Menu items for admin users.
 */
export const adminsMenuItems: MenuItem[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    icon: MdSpaceDashboard,
    href: '/admin-panel',
  },
  {
    key: 'orders',
    name: 'Zlecenia',
    icon: MdAssignment,
    href: '/admin-panel/orders',
  },
  {
    key: 'warehouse',
    name: 'Magazyn',
    icon: MdWarehouse,
    href: '/admin-panel/warehouse',
  },
  {
    key: 'billing',
    name: 'Rozliczenia',
    icon: MdReceiptLong,
    href: '/admin-panel/billing',
  },
  {
    key: 'employees',
    name: 'Pracownicy',
    icon: MdPeopleAlt,
    href: '/admin-panel/employees',
  },
  {
    key: 'settings',
    name: 'Ustawienia',
    icon: MdOutlineSettings,
    href: '/admin-panel/settings',
  },
]

/**
 * Menu items for technician users.
 */
export const techniciansMenuItems: MenuItem[] = [
  { key: 'dashboard', name: 'Dashboard', icon: MdSpaceDashboard, href: '/' },
  { key: 'orders', name: 'Zlecenia', icon: MdAssignment, href: '/orders' },
  { key: 'warehouse', name: 'Magazyn', icon: MdWarehouse, href: '/warehouse' },
  {
    key: 'billing',
    name: 'Rozliczenia',
    icon: MdReceiptLong,
    href: '/billing',
  },
  {
    key: 'settings',
    name: 'Ustawienia',
    icon: MdOutlineSettings,
    href: '/settings',
  },
]

/**
 * Mapping of status values to Polish equivalents.
 */
export const statusMap: Record<string, string> = {
  PENDING: 'NIE PRZYPISANE',
  IN_PROGRESS: 'W TRAKCIE',
  ASSIGNED: 'PRZYPISANE',
  COMPLETED: 'WYKONANE',
  NOT_COMPLETED: 'NIEWYKONANE',
  CANCELED: 'WYCOFANE',
}

/**
 * Mapping of status colors.
 */
export const statusColorMap: Record<string, string> = {
  PENDING: 'bg-muted hover:bg-muted/80 text-text-secodnary text-center',
  IN_PROGRESS: 'bg-black text-white text-center',
  ASSIGNED: 'bg-warning hover:bg-warning/80 text-white text-center',
  COMPLETED: 'bg-success text-white text-center',
  NOT_COMPLETED: 'bg-danger text-white text-center',
  CANCELED: 'bg-secondary text-white text-center',
}

/**
 * Mapping of order type to formatted Polish equivalents.
 */
export const orderType: Record<string, string> = {
  INSTALATION: 'Instalacja',
  SERVICE: 'Serwis',
}

/**
 * Mapping of time slots to formatted Polish equivalents.
 */
export const timeSlotOptions = {
  V: [
    { value: 'EIGHT_TEN', label: '08:00 - 10:00' },
    { value: 'TEN_TWELVE', label: '10:00 - 12:00' },
    { value: 'TWELVE_FOURTEEN', label: '12:00 - 14:00' },
    { value: 'FOURTEEN_SIXTEEN', label: '14:00 - 16:00' },
    { value: 'SIXTEEN_EIGHTEEN', label: '16:00 - 18:00' },
    { value: 'EIGHTEEN_TWENTY', label: '18:00 - 20:00' },
  ],
  MMP: [
    { value: 'NINE_TWELVE', label: '09:00 - 12:00' },
    { value: 'TWELVE_FIFTEEN', label: '12:00 - 15:00' },
    { value: 'FIFTEEN_EIGHTEEN', label: '15:00 - 18:00' },
    { value: 'EIGHTEEN_TWENTYONE', label: '18:00 - 21:00' },
  ],
}

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

/**
 * timeSlotMap (for displaying) – simple mapping "EIGHT_TEN" -> "08:00 - 10:00"
 */
export const timeSlotMap: Record<string, string> = {
  EIGHT_TEN: '08:00 - 10:00',
  TEN_TWELVE: '10:00 - 12:00',
  TWELVE_FOURTEEN: '12:00 - 14:00',
  FOURTEEN_SIXTEEN: '14:00 - 16:00',
  SIXTEEN_EIGHTEEN: '16:00 - 18:00',
  EIGHTEEN_TWENTY: '18:00 - 20:00',
  NINE_TWELVE: '09:00 - 12:00',
  TWELVE_FIFTEEN: '12:00 - 15:00',
  FIFTEEN_EIGHTEEN: '15:00 - 18:00',
  EIGHTEEN_TWENTYONE: '18:00 - 21:00',
}
