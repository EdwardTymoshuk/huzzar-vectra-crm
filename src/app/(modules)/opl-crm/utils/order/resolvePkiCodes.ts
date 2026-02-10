// pkiRules.ts
import { PkiCode } from '@/types/opl-crm/orders'
import { OplBaseWorkCode } from '@prisma/client'

/**
 * Resolves available PKI codes based on selected work codes.
 */
export const resolvePkiCodes = ({
  base,
  mrCount,
}: {
  base?: OplBaseWorkCode
  mrCount: number
}): PkiCode[] => {
  const priority: PkiCode[] = []

  if (mrCount > 0) {
    priority.push('PKI22', 'PKI23', 'PKI24')
  }

  switch (base) {
    case 'W4':
      priority.push('PKI16')
      break

    case 'W1':
      priority.push('PKI27', 'PKI1', 'PKI2', 'PKI4', 'PKI13')
      break

    case 'W2':
    case 'W3':
      priority.push('PKI1', 'PKI2', 'PKI4', 'PKI13')
      break

    case 'ZJN':
      priority.push('PKI26', 'PKI27')
      break

    case 'ZJD':
      priority.push('PKI4', 'PKI15', 'PKI13')
      break
  }

  return priority
}
