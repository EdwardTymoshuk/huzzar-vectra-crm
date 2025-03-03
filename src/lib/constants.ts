import {
  MdAssignment,
  MdOutlineSettings,
  MdPeopleAlt,
  MdReceiptLong,
  MdSpaceDashboard,
  MdWarehouse,
} from 'react-icons/md'

export const adminsMenuItems = [
  { name: 'Dashboard', icon: MdSpaceDashboard, href: '/admin-panel' },
  { name: 'Zlecenia', icon: MdAssignment, href: '/admin-panel/orders' },
  { name: 'Magazyn', icon: MdWarehouse, href: '/admin-panel/warehouse' },
  { name: 'Rozliczenia', icon: MdReceiptLong, href: '/admin-panel/billing' },
  { name: 'Pracownicy', icon: MdPeopleAlt, href: '/admin-panel/employees' },
  {
    name: 'Ustawienia',
    icon: MdOutlineSettings,
    href: '/admin-panel/settings',
  },
]
export const techniciansMenuItems = [
  { name: 'Dashboard', icon: MdSpaceDashboard, href: '/' },
  { name: 'Zlecenia', icon: MdAssignment, href: '/orders' },
  { name: 'Magazyn', icon: MdWarehouse, href: '/warehouse' },
  { name: 'Rozliczenia', icon: MdReceiptLong, href: '/billing' },
  { name: 'Ustawienia', icon: MdOutlineSettings, href: '/settings' },
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
