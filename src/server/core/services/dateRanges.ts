// src/server/modules/vectra-crm/services/dateRanges.ts

export type DateRangeKind = 'day' | 'month' | 'year'

/**
 * Returns start and end Date objects for given base date and range.
 * Ensures full coverage of the selected period with precise timestamps.
 */
export const getDateRange = (
  base: Date,
  range: DateRangeKind
): { start: Date; end: Date } => {
  const start = new Date(base)
  const end = new Date(base)

  if (range === 'day') {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (range === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(end.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
  } else {
    start.setMonth(0, 1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(11, 31)
    end.setHours(23, 59, 59, 999)
  }

  return { start, end }
}

/**
 * Returns a base date shifted one unit back
 * (previous day / month / year).
 */
export const getPreviousBaseDate = (base: Date, range: DateRangeKind): Date => {
  const prev = new Date(base)

  if (range === 'day') prev.setDate(prev.getDate() - 1)
  else if (range === 'month') prev.setMonth(prev.getMonth() - 1)
  else prev.setFullYear(prev.getFullYear() - 1)

  return prev
}
