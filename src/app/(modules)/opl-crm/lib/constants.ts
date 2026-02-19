//src/app/(modules)/opl-crm/lib/constants.ts

import { BadgeVariant } from '@/lib/constants'
import { PkiDefinition } from '@/types/opl-crm/orders'
import {
  OplActivationType,
  OplDeviceCategory,
  OplNetworkOeprator,
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

export const oplNetworkMap: Record<OplNetworkOeprator, string> = {
  ORANGE: 'Orange',
  SI: 'SI',
  PSO: 'PŚO',
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
  { value: 'ZJD1', label: 'ZJD1' },
  { value: 'ZJD3', label: 'ZJD3' },
  { value: 'ZJD5', label: 'ZJD5' },
  { value: 'ZJD30', label: 'ZJD30' },
  { value: 'ZJN', label: 'ZJN' },
  { value: 'ZJN1', label: 'ZJN1' },
  { value: 'ZJN3', label: 'ZJN3' },
  { value: 'ZJN5', label: 'ZJN5' },
  { value: 'ZJN30', label: 'ZJN30' },
  { value: 'ZJK', label: 'ZJK' },
]
export const oplActivationLabelMap: Record<OplActivationType, string> = {
  I_1P: '1P',
  I_2P: '2P',
  I_3P: '3P',
  UTD: 'UTD',
}

export const OPL_SERVICE_RATE_DEFAULTS = [
  { code: 'N-FTTH', amount: 42 },
  { code: 'N-ZA', amount: 30 },
  { code: 'NP-FTTH', amount: 90 },
  { code: 'OZA', amount: 13 },
  { code: 'SPLIT32', amount: 85 },
  { code: 'SPLIT64', amount: 127 },
  { code: 'PKU1', amount: 25 },
  { code: 'PKU2', amount: 4 },
  { code: 'PKU3', amount: 1 },
] as const

export const OPL_SERVICE_CODE_LABELS: Record<string, string> = {
  'N-FTTH': 'Usunięcie uszkodzeń dla usług FTTH',
  'N-ZA': 'Usunięcie uszkodzenia FTTH w sieci domowej klienta, wraz z wymianą ZA',
  'NP-FTTH': 'Usunięcie uszkodzenia FTTH na przyłączu',
  OZA: 'Odbiór urządzeń końcowych od klienta ZS/ZA',
  SPLIT32: 'Montaż splitera w OPP z podziałem łącza od 1:4 do 1:32',
  SPLIT64: 'Montaż splitera w OPP z podziałem łącza 1:64',
  PKU1: 'Wykonanie przelotu na przyłączu napowietrznym za każdy kolejny przelot.',
  PKU2: 'Wykonanie dodatkowego wykopu za każdy kolejny metr bieżący wykopu.',
  PKU3: 'Wciąganie mikrokabla lub kabla za każdy kolejny metr kanalizacji.',
}

export const OPL_SERVICE_WORK_CODES = [
  { code: 'N-FTTH', description: OPL_SERVICE_CODE_LABELS['N-FTTH'] },
  { code: 'N-ZA', description: OPL_SERVICE_CODE_LABELS['N-ZA'] },
  { code: 'NP-FTTH', description: OPL_SERVICE_CODE_LABELS['NP-FTTH'] },
  { code: 'OZA', description: OPL_SERVICE_CODE_LABELS.OZA },
  { code: 'SPLIT32', description: OPL_SERVICE_CODE_LABELS.SPLIT32 },
  { code: 'SPLIT64', description: OPL_SERVICE_CODE_LABELS.SPLIT64 },
  { code: 'PKU1', description: OPL_SERVICE_CODE_LABELS.PKU1 },
  { code: 'PKU2', description: OPL_SERVICE_CODE_LABELS.PKU2 },
  { code: 'PKU3', description: OPL_SERVICE_CODE_LABELS.PKU3 },
] as const

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

/**
 * Full list of PKI definitions (Overstandard installation costs).
 * Source: official HUZZAR PKI rate table.
 */
export const ALL_PKI_DEFS: PkiDefinition[] = [
  {
    code: 'PKI1',
    label:
      'Dodatkowa długość instalacji optycznej za każdy metr powyżej standardu',
  },
  {
    code: 'PKI2',
    label:
      'Dodatek za układanie korytek powyżej standardowej długości (za 1 m)',
  },
  {
    code: 'PKI3',
    label: 'Montaż skrzynki osłonowej',
  },
  {
    code: 'PKI4',
    label: 'Przewierty przez strop lub ściany o grubości powyżej 25 cm',
  },
  {
    code: 'PKI5',
    label: 'Układanie duktów, drabinek i łączników (za każdy metr)',
  },
  {
    code: 'PKI6',
    label: 'Budowa pionów technicznych (za jedną kondygnację)',
  },
  {
    code: 'PKI7',
    label: 'Uszczelnianie masą HILTI (1 uszczelnienie z materiałem)',
  },
  {
    code: 'PKI8',
    label: 'Uzyskanie zgody administratora wraz ze szkicem instalacji',
  },
  {
    code: 'PKI9',
    label: 'Wkuwanie instalacji pod tynk z wykończeniem do 3 mb',
  },
  {
    code: 'PKI10',
    label: 'Wkuwanie instalacji pod tynk – każdy kolejny metr',
  },
  {
    code: 'PKI11',
    label: 'Wprowadzenie kanalizacji lub kabla do budynku / studni',
  },
  {
    code: 'PKI12',
    label: 'Udrożnienie mikrokanalizacji lub rurociągu HDPE',
  },
  {
    code: 'PKI13',
    label: 'Montaż mufy lub gniazdka optycznego przelotowego',
  },
  {
    code: 'PKI14',
    label: 'Rozebranie i odtworzenie nawierzchni asfaltowej (1 m²)',
  },
  {
    code: 'PKI15',
    label: 'Rozebranie i odtworzenie nawierzchni twardej (1 m²)',
  },
  {
    code: 'PKI16',
    label: 'Dodatkowy metr instalacji optycznej dla standardu W4',
  },
  {
    code: 'PKI17',
    label: 'Pozyskanie zgód dla galerii handlowych i budynków B2B',
  },
  {
    code: 'PKI18',
    label: 'Geodezyjna dokumentacja powykonawcza przyłącza',
  },
  {
    code: 'PKI19',
    label: 'Malowanie ścian i sufitów farbą emulsyjną',
  },
  {
    code: 'PKI20',
    label: 'Montaż i ustawienie pierwszego słupa drewnianego',
  },
  {
    code: 'PKI21',
    label: 'Montaż i ustawienie kolejnego słupa drewnianego',
  },
  {
    code: 'PKI22',
    label: 'Przewierty przez ściany o grubości do 25 cm',
  },
  {
    code: 'PKI23',
    label:
      'Dodatkowa długość instalacji ethernetowej powyżej 15 mb dla usługi Multiroom',
  },
  {
    code: 'PKI24',
    label:
      'Dodatkowa długość instalacji ethernetowej powyżej 25 mb dla budowy sieci wewnętrznej',
  },
  {
    code: 'PKI25',
    label: 'Wykop w celu identyfikacji mikrokanalizacji (ZJ-DEW)',
  },
  {
    code: 'PKI26',
    label: 'Wprowadzenie kabla instalacyjnego do OPP',
  },
  {
    code: 'PKI27',
    label: 'Dospawanie pigtaila w OPP',
  },
  {
    code: 'PKI28',
    label: 'Wprowadzenie kabla lub mikrokanalizacji w mufie',
  },
  {
    code: 'PKI29',
    label: 'Kosztorys CESUB – zakres prac nieujęty w PKI',
  },
]
