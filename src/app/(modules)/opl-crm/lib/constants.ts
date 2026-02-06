//src/app/(modules)/opl-crm/lib/constants.ts

import { BadgeVariant } from '@/lib/constants'
import {
  OplDeviceCategory,
  OplOrderStandard,
  OplTimeSlot,
  OplWarehouseAction,
} from '@prisma/client'

export const oplDevicesTypeMap = {
  MODEM: 'MODEM',
  DECODER: 'DEKODER',
  ONT: 'ONT',
  PPOE_INJECTOR: 'PPOE INJECTOR',
  PPOE_SPLITTER: 'PPOE SPLITTER',
  SIM_CARD: 'KARTA SIM',
  WIFI_BOX: 'WIFI BOX',
  OTHER: 'INNE',
} satisfies Record<OplDeviceCategory, string>

export const sortedOplTimeSlotsByHour: OplTimeSlot[] = [
  // 1h
  'EIGHT_NINE',
  'NINE_TEN',
  'TEN_ELEVEN',
  'ELEVEN_TWELVE',
  'TWELVE_THIRTEEN',
  'THIRTEEN_FOURTEEN',
  'FOURTEEN_FIFTEEN',
  'FIFTEEN_SIXTEEN',
  'SIXTEEN_SEVENTEEN',
  'SEVENTEEN_EIGHTEEN',
  'EIGHTEEN_NINETEEN',
  'NINETEEN_TWENTY',

  // 2h
  'EIGHT_TEN',
  'TEN_TWELVE',
  'TWELVE_FOURTEEN',
  'FOURTEEN_SIXTEEN',
  'SIXTEEN_EIGHTEEN',
  'EIGHTEEN_TWENTY',

  // 3h
  'EIGHT_ELEVEN',
  'ELEVEN_FOURTEEN',
  'FOURTEEN_SEVENTEEN',
  'SEVENTEEN_TWENTY',

  // 6h
  'EIGHT_FOURTEEN',
  'FOURTEEN_TWENTY',
]

export const oplTimeSlotMap: Record<OplTimeSlot, string> = {
  // 1h
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

  // 2h
  EIGHT_TEN: '08:00 - 10:00',
  TEN_TWELVE: '10:00 - 12:00',
  TWELVE_FOURTEEN: '12:00 - 14:00',
  FOURTEEN_SIXTEEN: '14:00 - 16:00',
  SIXTEEN_EIGHTEEN: '16:00 - 18:00',
  EIGHTEEN_TWENTY: '18:00 - 20:00',

  // 3h
  EIGHT_ELEVEN: '08:00 - 11:00',
  ELEVEN_FOURTEEN: '11:00 - 14:00',
  FOURTEEN_SEVENTEEN: '14:00 - 17:00',
  SEVENTEEN_TWENTY: '17:00 - 20:00',

  // 4h
  EIGHT_TWELVE: '08:00 - 12:00',
  TWELVE_SIXTEEN: '12:00 - 16:00',
  SIXTEEN_TWENTY: '16:00 - 20:00',

  // 6h
  EIGHT_FOURTEEN: '08:00 - 14:00',
  FOURTEEN_TWENTY: '14:00 - 20:00',
}

/**
 * Options list for selects / dropdowns in OPL module.
 * Order is controlled by `sortedOplTimeSlotsByHour`.
 */
export const oplTimeSlotOptions: { value: OplTimeSlot; label: string }[] =
  sortedOplTimeSlotsByHour.map((slot) => ({
    value: slot,
    label: oplTimeSlotMap[slot],
  }))

export const oplOrderTypeMap = {
  INSTALLATION: 'Instalacja',
  SERVICE: 'Serwis',
  OUTAGE: 'Awaria',
}

export const oplWarehouseActionMap: Record<
  OplWarehouseAction,
  { label: string; variant: BadgeVariant }
> = {
  RECEIVED: { label: 'Przyjęcie', variant: 'success' },
  ISSUED: { label: 'Wydanie', variant: 'warning' },
  RETURNED: { label: 'Zwrot', variant: 'destructive' },
  RETURNED_TO_OPERATOR: { label: 'Zwrot do operatora', variant: 'danger' },
  TRANSFER: { label: 'Przekazanie', variant: 'secondary' },
  COLLECTED_FROM_CLIENT: { label: 'Odbiór od klienta', variant: 'default' },
  ISSUED_TO_CLIENT: { label: 'Wydanie klientowi', variant: 'warning' },
  ASSIGNED_TO_ORDER: { label: 'Przypisanie do zlecenia', variant: 'success' },
  RETURNED_TO_TECHNICIAN: {
    label: 'Zwrot do technika',
    variant: 'danger',
  },
}

export const oplOrderStandardOptions: {
  value: OplOrderStandard
  label: string
}[] = [
  { value: 'W1', label: 'W1' },
  { value: 'W2', label: 'W2' },
  { value: 'W3', label: 'W3' },
  { value: 'W4', label: 'W4' },
  { value: 'W5', label: 'W5' },
  { value: 'W6', label: 'W6' },
  { value: 'ZJD', label: 'ZJD' },
  { value: 'ZJN', label: 'ZJN' },
  { value: 'ZJK', label: 'ZJK' },
]

export const oplOrderFailureReasons = [
  'Rezygnacja',
  'Zmiana terminu z przyczyn klienckich',
  'Zmiana terminu z przyczyn technicznych',
  'Zmiana terminu z przyczyn technika',
  'Zwiększony zakres prac/PKI',
  'Brak dostępu do urządzeń OPL/OA',
  'Brak zgody administratora',
  'Braki materiałowe',
  'Błędne dane na umowie',
  'Siła wyższa',
]
