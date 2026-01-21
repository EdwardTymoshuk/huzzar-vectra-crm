import { VectraActivatedService } from '@/types/vectra-crm'
import {
  VectraDeviceCategory,
  VectraOrderStatus,
  VectraRateDefinition,
  VectraTimeSlot,
  VectraWarehouseAction,
} from '@prisma/client'

import { CleanTimelineItem } from '@/app/components/ui/timeline'

export const orderStatusToTimelineColor = {
  COMPLETED: 'success',
  NOT_COMPLETED: 'danger',
  ASSIGNED: 'warning',
  PENDING: 'secondary',
} satisfies Record<VectraOrderStatus, CleanTimelineItem['color']>

export const orderTypeMap = {
  INSTALLATION: 'Instalacja',
  SERVICE: 'Serwis',
  OUTAGE: 'Linia',
}

export const timeSlotOptions = [
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

export const timeSlotMap: Record<VectraTimeSlot, string> = {
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

export const sortedTimeSlotsByHour: VectraTimeSlot[] = [
  'EIGHT_TEN',
  'NINE_TWELVE',
  'TEN_TWELVE',
  'TWELVE_FOURTEEN',
  'TWELVE_FIFTEEN',
  'FOURTEEN_SIXTEEN',
  'FIFTEEN_EIGHTEEN',
  'SIXTEEN_EIGHTEEN',
  'EIGHTEEN_TWENTY',
  'EIGHTEEN_TWENTYONE',
]

export const timeSlotColorsV = {
  EIGHT_TEN: '#B3D9F0',
  TEN_TWELVE: '#80C3E5',
  TWELVE_FOURTEEN: '#4DAEDB',
  FOURTEEN_SIXTEEN: '#2B9FD8',
  SIXTEEN_EIGHTEEN: '#2388C2',
  EIGHTEEN_TWENTY: '#1D73AD',
}

export const timeSlotColorsMMP = {
  NINE_TWELVE: '#ffb199',
  TWELVE_FIFTEEN: '#f9763b',
  FIFTEEN_EIGHTEEN: '#f94500',
  EIGHTEEN_TWENTYONE: '#d13e00',
}

export const timeSlotColors = {
  V: timeSlotColorsV,
  MMP: timeSlotColorsMMP,
}

export const operatorColorsMap = {
  VECTRA: '#2d4083',
  PLAY: '#5d3582',
  'T-MOBILE': '#f915bb',
  ORANGE: '#fa7e18',
  PLUS: '#65b233',
  BIZNES: '#2083fe',
  MULTIMEDIA: '#e77d1f',
  DEFAULT: '#9ca3af',
}

export const warehouseActionMap: Record<
  VectraWarehouseAction,
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

export const orderFailureReasons = [
  'Brak kluczy / dostępu do skrzynki',
  'Brak kabla w lokalu AB',
  'Uszkodzony kabel sygnałowy',
  'Brak sygnału na budynku',
  'Instalator nie dotarł do AB',
  'Awaria',
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

export const mapServiceToCode = (
  service: VectraActivatedService,
  rates: VectraRateDefinition[]
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

export const mapInstallToCode = (
  type: 'LISTWA' | 'PION' | 'GNIAZDO' | 'PRZYŁĄCZE',
  rates: VectraRateDefinition[]
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
export const devicesTypeMap = {
  MODEM_HFC: 'MODEM HFC',
  MODEM_GPON: 'MODEM GPON',
  DECODER_1_WAY: 'DEKODER 1 WAY',
  DECODER_2_WAY: 'DEKODER 2 WAY',
  NETWORK_DEVICE: 'SPRZĘT SIECIOWY',
  OTHER: 'INNE',
} satisfies Record<VectraDeviceCategory, string>

export const orderTimelineColorMap: Record<VectraOrderStatus, string> = {
  COMPLETED: 'bg-success',
  NOT_COMPLETED: 'bg-danger',
  ASSIGNED: 'bg-warning',
  PENDING: 'bg-secondary',
}

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'
