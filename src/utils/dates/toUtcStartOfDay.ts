export function toUtcStartOfDay(dateStr: string): Date {
  // accept 2025-09-08
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(
      `Nieprawidłowy format daty: "${dateStr}" (wymagane YYYY-MM-DD)`
    )
  }
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  if (isNaN(d.getTime())) {
    throw new Error(`Nie można sparsować daty: "${dateStr}"`)
  }
  return d
}
