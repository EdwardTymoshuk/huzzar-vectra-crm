// sortPkiByPriority.ts
import { PkiCode, PkiDefinition } from '@/types/opl-crm/orders'

/**
 * Returns PKI list sorted by priority.
 * If no priority is provided, original order is preserved.
 */
export const sortPkiByPriority = (
  all: PkiDefinition[],
  priority: PkiCode[]
): PkiDefinition[] => {
  if (priority.length === 0) {
    return all
  }

  const prioritySet = new Set(priority)

  const prioritized = priority
    .map((code) => all.find((p) => p.code === code))
    .filter((p): p is PkiDefinition => Boolean(p))

  const rest = all.filter((p) => !prioritySet.has(p.code))

  return [...prioritized, ...rest]
}
