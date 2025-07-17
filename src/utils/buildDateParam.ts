import { format } from 'date-fns'

export const buildDateParam = (
  date: Date | undefined,
  range: 'day' | 'month' | 'year'
): string => {
  const d = date ?? new Date()

  switch (range) {
    case 'day':
      return format(d, 'yyyy-MM-dd')
    case 'month':
      return format(d, 'yyyy-MM')
    case 'year':
      return format(d, 'yyyy')
    default:
      return format(d, 'yyyy-MM-dd')
  }
}
