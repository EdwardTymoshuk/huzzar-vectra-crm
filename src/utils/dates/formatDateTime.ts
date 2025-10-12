import { format } from 'date-fns'

/**
 * Formats a JavaScript Date object into a string with date and time.
 * Example: '05.05.2025 14:30'
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd.MM.yyyy HH:mm')
}

export const formatDate = (date?: Date): string | undefined =>
  date ? date.toLocaleDateString('en-CA') : undefined
