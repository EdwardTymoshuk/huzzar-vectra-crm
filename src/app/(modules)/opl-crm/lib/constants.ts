//src/app/(modules)/opl-crm/lib/constants.ts

import { OplDeviceCategory, OplTimeSlot } from '@prisma/client'

export const oplDeviceTypeMap = {
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
