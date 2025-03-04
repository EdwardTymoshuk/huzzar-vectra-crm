// src/lib/constants.ts

import { IconType } from 'react-icons'
import {
  MdAssignment,
  MdOutlineSettings,
  MdPeopleAlt,
  MdReceiptLong,
  MdSpaceDashboard,
  MdWarehouse,
} from 'react-icons/md'

/**
 * Interface for menu items to enforce correct data structure.
 */
export interface MenuItem {
  key: string
  name: string
  icon: IconType
  href: string
}

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
  PENDING: 'bg-muted hover:bg-muted/80 text-text-secodnary',
  IN_PROGRESS: 'bg-black text-white',
  ASSIGNED: 'bg-warning hover:bg-warning/80 text-white',
  COMPLETED: 'bg-success text-white',
  NOT_COMPLETED: 'bg-danger text-white',
  CANCELED: 'bg-secondary text-white',
}

/**
 * Mapping of time slots to formatted Polish equivalents.
 */
export const timeSlotMap: Record<string, string> = {
  EIGHT_ELEVEN: '8-11',
  ELEVEN_FOURTEEN: '11-14',
  FOURTEEN_SEVENTEEN: '14-17',
  SEVENTEEN_TWENTY: '17-20',
}
