/**
 * Resolves date range boundaries based on selected date and range.
 * Used by dashboard drill-down queries.
 */
export function resolveDateRange(
  date: Date | undefined,
  range: 'day' | 'month' | 'year'
): { dateFrom?: Date; dateTo?: Date } {
  if (!date) return {}

  const from = new Date(date)
  const to = new Date(date)

  if (range === 'day') {
    from.setHours(0, 0, 0, 0)
    to.setHours(23, 59, 59, 999)
  }

  if (range === 'month') {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)

    to.setMonth(to.getMonth() + 1, 0)
    to.setHours(23, 59, 59, 999)
  }

  if (range === 'year') {
    from.setMonth(0, 1)
    from.setHours(0, 0, 0, 0)

    to.setMonth(11, 31)
    to.setHours(23, 59, 59, 999)
  }

  return { dateFrom: from, dateTo: to }
}
