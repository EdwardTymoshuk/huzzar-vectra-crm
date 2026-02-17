type Measurements = {
  opp: string
  go: string
}

const MEASUREMENT_PREFIX = 'POMIAR:'

const normalizeMeasurementValue = (value: string): string => {
  const raw = value.trim().replace(',', '.')
  if (!raw) return ''
  const numeric = Number(raw.replace('-', ''))
  if (Number.isNaN(numeric)) return ''
  return `-${numeric}`
}

export const formatMeasurementsLine = (measurements: Measurements): string => {
  const opp = normalizeMeasurementValue(measurements.opp)
  const go = normalizeMeasurementValue(measurements.go)
  if (!opp && !go) return ''

  const parts: string[] = []
  if (opp) parts.push(`# OPP: ${opp} dB`)
  if (go) parts.push(`# GO: ${go} dB`)
  return `${MEASUREMENT_PREFIX} ${parts.join(' ')}`
}

export const parseMeasurementsFromNotes = (
  notes?: string | null
): { measurements: Measurements; plainNotes: string } => {
  const source = notes ?? ''
  if (!source.trim()) {
    return { measurements: { opp: '', go: '' }, plainNotes: '' }
  }

  const lines = source.split('\n')
  const measurementLineIndex = lines.findIndex((line) =>
    line.trim().toUpperCase().startsWith(MEASUREMENT_PREFIX)
  )

  if (measurementLineIndex < 0) {
    return { measurements: { opp: '', go: '' }, plainNotes: source }
  }

  const measurementLine = lines[measurementLineIndex] ?? ''
  const oppMatch = measurementLine.match(/OPP\s*[:\-]\s*(-?\d+(?:[.,]\d+)?)/i)
  const goMatch = measurementLine.match(/GO\s*[:\-]\s*(-?\d+(?:[.,]\d+)?)/i)

  const opp = oppMatch ? String(oppMatch[1]).replace(',', '.') : ''
  const go = goMatch ? String(goMatch[1]).replace(',', '.') : ''

  const remaining = lines
    .filter((_, idx) => idx !== measurementLineIndex)
    .join('\n')
    .trim()

  return {
    measurements: { opp, go },
    plainNotes: remaining,
  }
}

export const buildOrderNotesWithMeasurements = (
  notes: string,
  measurements: Measurements
): string => {
  const measurementLine = formatMeasurementsLine(measurements)
  const cleanNotes = notes.trim()
  if (!measurementLine) return cleanNotes
  if (!cleanNotes) return measurementLine
  return `${measurementLine}\n${cleanNotes}`
}
