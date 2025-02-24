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
