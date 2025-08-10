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

  /* MATERIAŁY */
  'KABEL RG-6 (mb)',
  'KABEL RG-11 (mb)',
  'KABEL UTP (mb)',
  'ZŁĄCZE F-60 (szt)',
  'ZŁĄCZE F-59 (szt)',
  'ZŁĄCZE F-11 (szt)',
  'ADAPTER FF-FF (szt)',
  'OPORNIK 75 Ω (szt)',
  'ZŁĄCZE WKW “M” (szt)',
  'ZŁĄCZE WKG “F” (szt)',
  'ZŁĄCZE WKS “S” (szt)',
  'GN. 2×DATA (szt)',
  'GN. 3×DATA (szt)',
  'DSS2 (szt)',
  'DSS3 (szt)',
  'DSS3U (szt)',
  'DSS4 (szt)',
  'FILTR SOLO NET',
  'TŁUMIK TKZ-03 (szt)',
  'TŁUMIK TKZ-06 (szt)',
  'TŁUMIK TKZ-09 (szt)',
  'TŁUMIK TKZ-12 (szt)',
  'TŁUMIK AFM-1A (szt)',
  'TŁUMIK AFM-2A (szt)',
  'TŁUMIK AFM-3A (szt)',
  'TŁUMIK AFM-4A (szt)',
  'TŁUMIK AFM-6A (szt)',
  'TŁUMIK AFM-8A (szt)',
  'TŁUMIK AFM-10A (szt)',
  'TŁUMIK AFM-12A (szt)',
  'UCHWYT KABLA FLOP (szt)',
  'OPASKA KABLOWA (szt)',
  'KORYTKO 15×10 2 m (szt)',
  'RURA PCV RL18 2 m (szt)',
  'KOLANKO ZCL18 (szt)',
  'UCHWYT UZ18 (szt)',
  'OZNACZNIK KABLOWY',
  'PATCHCORD 1 m',
  'PATCHCORD 3 m',
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
  'TŁUMIK AFM-1A (szt)',
  'TŁUMIK AFM-2A (szt)',
  'TŁUMIK AFM-3A (szt)',
  'TŁUMIK AFM-4A (szt)',
  'TŁUMIK AFM-6A (szt)',
  'TŁUMIK AFM-8A (szt)',
  'TŁUMIK AFM-10A (szt)',
  'TŁUMIK AFM-12A (szt)',
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
export const ORANGE_COLS = new Set([
  'KABEL RG-6 (mb)',
  'KABEL RG-11 (mb)',
  'KABEL UTP (mb)',
])
export const PURPLE_COLS = new Set([
  'ZŁĄCZE F-60 (szt)',
  'ZŁĄCZE F-59 (szt)',
  'ZŁĄCZE F-11 (szt)',
  'ADAPTER FF-FF (szt)',
  'OPORNIK 75 Ω (szt)',
  'ZŁĄCZE WKW “M” (szt)',
  'ZŁĄCZE WKG “F” (szt)',
  'ZŁĄCZE WKS “S” (szt)',
])
export const DARK_YELLOW_COLS = new Set([
  'GN. 2×DATA (szt)',
  'GN. 3×DATA (szt)',
])
export const GREEN_COLS = new Set([
  'DSS2 (szt)',
  'DSS3 (szt)',
  'DSS3U (szt)',
  'DSS4 (szt)',
  'FILTR SOLO NET',
])
export const PEACH_COLS = new Set([
  'TŁUMIK TKZ-03 (szt)',
  'TŁUMIK TKZ-06 (szt)',
  'TŁUMIK TKZ-09 (szt)',
  'TŁUMIK TKZ-12 (szt)',
])
export const LIGHT_ORANGE_COLS = new Set([
  'UCHWYT KABLA FLOP (szt)',
  'OPASKA KABLOWA (szt)',
])
export const LIGHT_PURPLE_COLS = new Set([
  'KORYTKO 15×10 2 m (szt)',
  'RURA PCV RL18 2 m (szt)',
  'KOLANKO ZCL18 (szt)',
  'UCHWYT UZ18 (szt)',
])
export const YELLOW_COLS = new Set(['OZNACZNIK KABLOWY'])

/* od której kolumny pionowy tekst */
export const VERT_START = COLS.indexOf('Pion (Ilość kondygnacji)') + 1

export function pickFill(hdr: string) {
  if (LIGHT_GRAY_COLS.has(hdr)) return LIGHT_GRAY
  if (LIGHT_GREEN_COLS.has(hdr)) return LIGHT_GREEN
  if (LIGHT_BLUE_COLS.has(hdr)) return LIGHT_BLUE
  if (DECODER_COLOR_COLS.has(hdr)) return DECODER_COLOR
  if (MODEM_COLOR_COLS.has(hdr)) return MODEM_COLOR
  if (GRAY_COLS.has(hdr)) return GRAY
  if (ORANGE_COLS.has(hdr)) return ORANGE
  if (PURPLE_COLS.has(hdr)) return PURPLE
  if (DARK_YELLOW_COLS.has(hdr)) return DARK_YELLOW
  if (GREEN_COLS.has(hdr)) return GREEN
  if (PEACH_COLS.has(hdr)) return PEACH
  if (LIGHT_ORANGE_COLS.has(hdr)) return LIGHT_ORANGE
  if (LIGHT_PURPLE_COLS.has(hdr)) return LIGHT_PURPLE
  if (YELLOW_COLS.has(hdr)) return YELLOW
  return DEFAULT
}
