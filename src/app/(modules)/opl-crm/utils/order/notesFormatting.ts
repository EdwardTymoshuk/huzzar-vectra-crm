type Measurements = {
  opp: string
  go: string
}

const MEASUREMENT_PREFIX = 'POMIAR:'
const IMPORT_ROUTE_START = '[[OPL_IMPORT_ROUTE]]'
const IMPORT_ROUTE_END = '[[/OPL_IMPORT_ROUTE]]'

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
): { measurements: Measurements; plainNotes: string; importRoute: string } => {
  const source = notes ?? ''
  const routeMatch = source.match(
    /\[\[OPL_IMPORT_ROUTE\]\]([\s\S]*?)\[\[\/OPL_IMPORT_ROUTE\]\]/
  )
  const importRoute = routeMatch?.[1]?.trim() ?? ''
  const sourceWithoutRoute = source
    .replace(/\n?\[\[OPL_IMPORT_ROUTE\]\][\s\S]*?\[\[\/OPL_IMPORT_ROUTE\]\]\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!sourceWithoutRoute.trim()) {
    return { measurements: { opp: '', go: '' }, plainNotes: '', importRoute }
  }

  const lines = sourceWithoutRoute.split('\n')
  const measurementLineIndex = lines.findIndex((line) =>
    line.trim().toUpperCase().startsWith(MEASUREMENT_PREFIX)
  )

  if (measurementLineIndex < 0) {
    return { measurements: { opp: '', go: '' }, plainNotes: sourceWithoutRoute, importRoute }
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
    importRoute,
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

export const appendImportedRouteMarker = (
  notes: string,
  importRoute?: string | null
): string => {
  const cleanNotes = notes.trim()
  const route = String(importRoute ?? '').trim()
  if (!route) return cleanNotes

  const marker = `${IMPORT_ROUTE_START}\n${route}\n${IMPORT_ROUTE_END}`
  if (!cleanNotes) return marker
  return `${cleanNotes}\n${marker}`
}
