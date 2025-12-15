import { Borders, Fill } from 'exceljs'

export const COLS = [
  'Lp.',
  'schemat / nr klienta',
  'Adres\nMIASTO, ULICA NUMER',
  'WYKONANE\nTAK | NIE',
  'UWAGI',
  'TECHNOLOGIA\nHFC | GPON',
  'DTV',
  'multiroom ATV/DTV; przebudowy',
  'NET',
  'TEL',
  'ATV',
  'uruchomienie gniazda',
  'uruchomienie instalacji przyłącza ab.',
  'dekoder 2-way',
  'adres MAC dekodera',
  'US. 40/51 dBm',
  'DS. −9/+11 dBm',
  'dekoder 1-way | moduł CI+',
  'numer SN dekodera | karty CI+',
  'modem NET / terminal TEL',
  'adres MAC modemu',
  'US. 40/51 dBm',
  'DS. −9/+11 dBm',
  'Pomiar prędkości 300/600',
  'Pion (Ilość kondygnacji)',
  'Montaż listew / rur PCV (mb)',
]

/* ───────── grupy (wiersz 1) ───────── */
export const GROUPS = [
  { title: 'RAPORT', span: 3 },
  { title: 'URUCHOMIENIE USŁUG', span: 5 },
  { title: 'INSTALACJA', span: 2 },
  { title: 'ZAKOŃCZENIA ABONENCKIE', span: 11 },
]

/* ───────── style ───────── */
export const DEFAULT: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'ffffffff' },
}
export const BLUE: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0070C0' },
}
export const GRAY: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'ffd8d8d8' },
}
export const GREEN: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'ffc4e0b3' },
}
export const LIGHT_GRAY: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fff2f2f2' },
}
export const LIGHT_BLUE: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'ffddebf6' },
}
export const LIGHT_GREEN: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'ffe2efd9' },
}
export const ORANGE: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fff3b183' },
}
export const LIGHT_ORANGE: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fffbc006' },
}
export const PURPLE: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'ffb5c5e8' },
}
export const LIGHT_PURPLE: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'ffd8e2f2' },
}
export const YELLOW: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fffffe07' },
}
export const DARK_YELLOW: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fffde598' },
}
export const LIGHT_YELLOW: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fffffe0b' },
}
export const PEACH: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fffbe4d5' },
}
export const DECODER_COLOR: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fffae5d6' },
}
export const MODEM_COLOR: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'fffef3d1' },
}

export const BORDER: Borders = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
  diagonal: { style: 'thin' },
}

export const THICK_BORDER: Borders = {
  top: { style: 'medium' },
  left: { style: 'medium' },
  bottom: { style: 'medium' },
  right: { style: 'medium' },
  diagonal: { style: 'medium' },
}

export const THICK_COLS = new Set<string>([
  'Pion (Ilość kondygnacji)',
  'Montaż listew / rur PCV (mb)',
  'schemat / nr klienta',
  'WYKONANE\nTAK | NIE',
  'UWAGI',
  'TECHNOLOGIA\nHFC | GPON',
])

export const DEFAULT_BLACK_BOLD = { bold: true, color: { argb: 'ff000000' } }

/* kolumny z kolorami */
export const LIGHT_GRAY_COLS = new Set([
  'Lp.',
  'schemat / nr klienta',
  ...GROUPS.map((g) => g.title),
  'adres MAC dekodera',
  'numer SN dekodera | karty CI+',
  'adres MAC modemu',
  'Pomiar prędkości 300/600',
])

export const LIGHT_BLUE_COLS = new Set([
  'uruchomienie gniazda',
  'uruchomienie instalacji przyłącza ab.',
])

export const LIGHT_GREEN_COLS = new Set(['US. 40/51 dBm', 'DS. −9/+11 dBm'])
export const DECODER_COLOR_COLS = new Set([
  'dekoder 2-way',
  'dekoder 1-way | moduł CI+',
])
export const MODEM_COLOR_COLS = new Set(['modem NET / terminal TEL'])

export const GRAY_COLS = new Set([
  'Pion (Ilość kondygnacji)',
  'Montaż listew / rur PCV (mb)',
])

/* od której kolumny pionowy tekst */
export const VERT_START = COLS.indexOf('Pion (Ilość kondygnacji)') + 1

export function pickFill(hdr: string) {
  if (LIGHT_GRAY_COLS.has(hdr)) return LIGHT_GRAY
  if (LIGHT_GREEN_COLS.has(hdr)) return LIGHT_GREEN
  if (LIGHT_BLUE_COLS.has(hdr)) return LIGHT_BLUE
  if (DECODER_COLOR_COLS.has(hdr)) return DECODER_COLOR
  if (MODEM_COLOR_COLS.has(hdr)) return MODEM_COLOR
  if (GRAY_COLS.has(hdr)) return GRAY
  return DEFAULT
}
