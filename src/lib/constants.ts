// src/lib/constants.ts

import { MenuItem } from '@/types'
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

export const operatorColors: Record<string, string> = {
  V: '#2B9FD8',
  MMP: '#f94500',
}

export const timeSlotColorsV: Record<string, string> = {
  EIGHT_TEN: '#B3D9F0', // Lightest variant
  TEN_TWELVE: '#80C3E5',
  TWELVE_FOURTEEN: '#4DAEDB',
  FOURTEEN_SIXTEEN: '#2B9FD8', // Base color for V
  SIXTEEN_EIGHTEEN: '#2388C2',
  EIGHTEEN_TWENTY: '#1D73AD', // Darkest variant
}

export const timeSlotColorsMMP: Record<string, string> = {
  NINE_TWELVE: '#ffb199', // Lightest variant
  TWELVE_FIFTEEN: '#f9763b',
  FIFTEEN_EIGHTEEN: '#f94500', // Base color for MMP
  EIGHTEEN_TWENTYONE: '#d13e00', // Darkest variant
}

export const timeSlotColors: Record<string, Record<string, string>> = {
  V: timeSlotColorsV,
  MMP: timeSlotColorsMMP,
}
