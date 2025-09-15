// src/lib/constants.ts

import { ActivatedService, MenuItem } from '@/types'
import { RateDefinition, TimeSlot, WarehouseAction } from '@prisma/client'
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
  ASSIGNED: 'PRZYPISANE',
  COMPLETED: 'WYKONANE',
  NOT_COMPLETED: 'NIEWYKONANE',
}

/**
 * Mapping of status colors.
 */
export const statusColorMap: Record<string, string> = {
  PENDING: 'bg-primary hover:bg-primary/80 text-white text-center',
  ASSIGNED: 'bg-warning hover:bg-warning/80 text-white text-center',
  COMPLETED: 'bg-success hover:bg-success/80 text-white text-center',
  NOT_COMPLETED: 'bg-danger hover:bg-danger/80 text-white text-center',
}

/**
 * Mapping of order type to formatted Polish equivalents.
 */
export const orderTypeMap: Record<string, string> = {
  INSTALATION: 'Instalacja',
  SERVICE: 'Serwis',
  OUTAGE: 'Linia',
}

/**
 * Mapping of time slots to formatted Polish equivalents.
 */
export const timeSlotOptions = [
  // one hour time slots
  { value: 'EIGHT_NINE', label: '08:00 - 09:00' },
  { value: 'NINE_TEN', label: '09:00 - 10:00' },
  { value: 'TEN_ELEVEN', label: '10:00 - 11:00' },
  { value: 'ELEVEN_TWELVE', label: '11:00 - 12:00' },
  { value: 'TWELVE_THIRTEEN', label: '12:00 - 13:00' },
  { value: 'THIRTEEN_FOURTEEN', label: '13:00 - 14:00' },
  { value: 'FOURTEEN_FIFTEEN', label: '14:00 - 15:00' },
  { value: 'FIFTEEN_SIXTEEN', label: '15:00 - 16:00' },
  { value: 'SIXTEEN_SEVENTEEN', label: '16:00 - 17:00' },
  { value: 'SEVENTEEN_EIGHTEEN', label: '17:00 - 18:00' },
  { value: 'EIGHTEEN_NINETEEN', label: '18:00 - 19:00' },
  { value: 'NINETEEN_TWENTY', label: '19:00 - 20:00' },
  { value: 'TWENTY_TWENTYONE', label: '20:00 - 21:00' },

  // two and three hour time slots
  { value: 'EIGHT_TEN', label: '08:00 - 10:00' },
  { value: 'TEN_TWELVE', label: '10:00 - 12:00' },
  { value: 'TWELVE_FOURTEEN', label: '12:00 - 14:00' },
  { value: 'FOURTEEN_SIXTEEN', label: '14:00 - 16:00' },
  { value: 'SIXTEEN_EIGHTEEN', label: '16:00 - 18:00' },
  { value: 'EIGHTEEN_TWENTY', label: '18:00 - 20:00' },
  { value: 'NINE_TWELVE', label: '09:00 - 12:00' },
  { value: 'TWELVE_FIFTEEN', label: '12:00 - 15:00' },
  { value: 'FIFTEEN_EIGHTEEN', label: '15:00 - 18:00' },
  { value: 'EIGHTEEN_TWENTYONE', label: '18:00 - 21:00' },
]

/**
 * timeSlotMap (for displaying) – simple mapping "EIGHT_TEN" -> "08:00 - 10:00"
 */

export const timeSlotMap: Record<string, string> = {
  EIGHT_NINE: '08:00 - 09:00',
  NINE_TEN: '09:00 - 10:00',
  TEN_ELEVEN: '10:00 - 11:00',
  ELEVEN_TWELVE: '11:00 - 12:00',
  TWELVE_THIRTEEN: '12:00 - 13:00',
  THIRTEEN_FOURTEEN: '13:00 - 14:00',
  FOURTEEN_FIFTEEN: '14:00 - 15:00',
  FIFTEEN_SIXTEEN: '15:00 - 16:00',
  SIXTEEN_SEVENTEEN: '16:00 - 17:00',
  SEVENTEEN_EIGHTEEN: '17:00 - 18:00',
  EIGHTEEN_NINETEEN: '18:00 - 19:00',
  NINETEEN_TWENTY: '19:00 - 20:00',
  TWENTY_TWENTYONE: '20:00 - 21:00',

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

export const sortedTimeSlotsByHour: TimeSlot[] = [
  // 08:00
  'EIGHT_NINE',
  'EIGHT_TEN',

  // 09:00
  'NINE_TEN',
  'NINE_TWELVE',

  // 10:00
  'TEN_ELEVEN',
  'TEN_TWELVE',

  // 11:00
  'ELEVEN_TWELVE',

  // 12:00
  'TWELVE_THIRTEEN',
  'TWELVE_FOURTEEN',
  'TWELVE_FIFTEEN',

  // 13:00
  'THIRTEEN_FOURTEEN',

  // 14:00
  'FOURTEEN_FIFTEEN',
  'FOURTEEN_SIXTEEN',

  // 15:00
  'FIFTEEN_SIXTEEN',
  'FIFTEEN_EIGHTEEN',

  // 16:00
  'SIXTEEN_SEVENTEEN',
  'SIXTEEN_EIGHTEEN',

  // 17:00
  'SEVENTEEN_EIGHTEEN',

  // 18:00
  'EIGHTEEN_NINETEEN',
  'EIGHTEEN_TWENTY',
  'EIGHTEEN_TWENTYONE',

  // 19:00
  'NINETEEN_TWENTY',

  // 20:00
  'TWENTY_TWENTYONE',
]

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

export const userRoleMap: Record<string, string> = {
  TECHNICIAN: 'TECHNIK',
  ADMIN: 'ADMINISTRATOR',
  COORDINATOR: 'KOORDYNATOR',
  WAREHOUSEMAN: 'MAGAZYNIER',
  USER: 'UŻYTKOWNIK',
}

/**
 * Mapping of user status to polish.
 */
export const userStatusNameMap: Record<string, string> = {
  ACTIVE: 'AKTYWNY',
  INACTIVE: 'NIEAKTYWNY',
  SUSPENDED: 'ZABLOKOWANY',
}

/**
 * Mapping of user status colors.
 */
export const userStatusColorMap: Record<string, string> = {
  ACTIVE: 'bg-success hover:bg-success text-white text-center',
  INACTIVE: 'bg-danger hover:bg-danger text-white text-center',
  SUSPENDED: 'bg-warning hover:bg-warning text-white text-center',
}

/**
 * Mapping of devices type to polish.
 */
export const devicesTypeMap: Record<string, string> = {
  MODEM: 'MODEM',
  DECODER_1_WAY: 'DEKODER 1 WAY',
  DECODER_2_WAY: 'DEKODER 2 WAY',
  AMPLIFIER: 'WZMACNIACZ',
  ONT: 'ONT',
  UA: 'UA',
  OTHER: 'INNE',
}
/**
 * Mapping of devices status to polish.
 */
export const devicesStatusMap: Record<string, string> = {
  AVAILABLE: 'DOSTĘPNY',
  ASSIGNED: 'PRZYPISANY DO TECHNIKA',
  RETURNED: 'ZWRÓCONY',
  RETURNED_TO_OPERATOR: 'ZWRÓCONY',
  ASSIGNED_TO_ORDER: 'WYDANY',
}
/**
 * Mapping of material units to Polish display names.
 */
export const materialUnitMap: Record<string, string> = {
  PIECE: 'szt',
  METER: 'mb',
}

/**
 * Mapping of warehouse action types to label and badge color.
 */
export const warehouseActionMap: Record<
  WarehouseAction,
  {
    label: string
    variant:
      | 'success'
      | 'warning'
      | 'destructive'
      | 'danger'
      | 'secondary'
      | 'default'
  }
> = {
  RECEIVED: { label: 'Przyjęcie', variant: 'success' },
  ISSUED: { label: 'Wydanie', variant: 'warning' },
  RETURNED: { label: 'Zwrot', variant: 'destructive' },
  RETURNED_TO_OPERATOR: { label: 'Zwrot do operatora', variant: 'danger' },
  TRANSFER: { label: 'Przekazanie', variant: 'secondary' },
  COLLECTED_FROM_CLIENT: { label: 'Odbiór od klienta', variant: 'default' },
}

//polish monthes
export const polishMonthsNominative = [
  'styczeń',
  'luty',
  'marzec',
  'kwiecień',
  'maj',
  'czerwiec',
  'lipiec',
  'sierpień',
  'wrzesień',
  'październik',
  'listopad',
  'grudzień',
]

export const orderFailureReasons = [
  'Brak kluczy / dostępu do skrzynki',
  'Brak kabla w lokalu AB',
  'Uszkodzony kabel sygnałowy',
  'Brak sygnału na budynku',
  'Instalator nie dotarł do AB',
  'Linia',
  'Błędne dane na umowie',
  'Niezgodność umowy z zamówieniem',
  'Błędny termin realizacji zlecenia',
  'Brak AB w lokalu',
  'Zmiana terminu przez AB',
  'Problem ze sprzętem AB',
  'Brak zgody na wiercenie',
  'Nie uwolniony kabel',
  'Rezygnacja AB',
]
// Mapping services to working codes (to settlementEntry)
export const mapServiceToCode = (
  service: ActivatedService,
  rates: RateDefinition[]
): string | null => {
  if (service.type === 'DTV' && service.deviceType === 'DECODER_1_WAY')
    return rates.find((r) => r.code.includes('1-way'))?.code || null
  if (service.type === 'DTV' && service.deviceType === 'DECODER_2_WAY')
    return rates.find((r) => r.code.includes('2-way'))?.code || null
  if (service.type === 'NET')
    return rates.find((r) => r.code.includes('NET'))?.code || null
  if (service.type === 'TEL')
    return (
      rates.find((r) => r.code.includes('TEL'))?.code ||
      rates.find((r) => r.code.includes('NET'))?.code ||
      null
    )
  if (service.type === 'ATV')
    return rates.find((r) => r.code.includes('1-way'))?.code || null
  return null
}

//Mapping instalation section to working codes (to settlementEntry)
export const mapInstallToCode = (
  type: 'LISTWA' | 'PION' | 'GNIAZDO' | 'PRZYŁĄCZE',
  rates: RateDefinition[]
): string | null => {
  if (type === 'LISTWA')
    return (
      rates.find((r) => r.code.toLowerCase().includes('listw'))?.code || null
    )
  if (type === 'PION')
    return (
      rates.find((r) => r.code.toLowerCase().includes('pion'))?.code || null
    )
  if (type === 'GNIAZDO')
    return (
      rates.find((r) => r.code.toLowerCase().includes('gniaz'))?.code || null
    )
  if (type === 'PRZYŁĄCZE')
    return (
      rates.find((r) => r.code.toLowerCase().includes('przył'))?.code || null
    )
  return null
}
