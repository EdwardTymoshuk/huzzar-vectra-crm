import { Borders, Fill } from 'exceljs'

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
