import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

/**
 * Formats a JavaScript Date or ISO string into 'dd.MM.yyyy HH:mm'.
 * Example: '05.11.2025 14:30'
 */
export const formatDateTime = (date: Date | string): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return format(d, 'dd.MM.yyyy HH:mm', { locale: pl })
}

/**
 * Formats a JavaScript Date or ISO string into 'dd.MM.yyyy'.
 * Example: '05.11.2025'
 */
export const formatDate = (date: Date | string): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return format(d, 'dd.MM.yyyy', { locale: pl })
}

/**
 * Formats a Date or string into 'yyyy-MM-dd' for API or HTML date inputs.
 * Example: '2025-11-05'
 */
export const formatDateForInput = (
  date?: Date | string
): string | undefined => {
  if (!date) return undefined
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return undefined
  return format(d, 'yyyy-MM-dd')
}
