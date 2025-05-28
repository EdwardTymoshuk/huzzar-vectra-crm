// utils/buildDateParam.ts
import { format } from 'date-fns'

export const buildDateParam = (
  date: Date | undefined,
  range: 'day' | 'month' | 'year'
) => {
  const d = date ?? new Date()

  switch (range) {
    case 'day':
      return format(d, 'yyyy-MM-dd') // 2025-03-01
    case 'month':
      return format(d, 'yyyy-MM') // 2025-03
    case 'year':
      return format(d, 'yyyy') // 2025
  }
}
