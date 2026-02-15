'use client'

import { Badge } from '@/app/components/ui/badge'
import {
  buildOrderedWorkCodes,
  shouldShowWorkCodeQuantity,
  toWorkCodeLabel,
} from '@/app/(modules)/opl-crm/utils/order/workCodesPresentation'
import { DigInput, WorkCodePayload } from '@/types/opl-crm/orders'

type Props = {
  value: WorkCodePayload[]
  digInput?: DigInput | null
}

/**
 * Displays selected work codes summary.
 * DIG addons are derived from digInput (not stored directly).
 */
export const SelectedCodesSummary = ({ value, digInput }: Props) => {
  const ordered = buildOrderedWorkCodes(value, digInput)

  return (
    <div className="flex flex-wrap gap-2">
      {ordered.map(({ code, quantity }) => (
        <Badge key={code} className="px-5 py-2 text-sm">
          {toWorkCodeLabel(code)}
          {shouldShowWorkCodeQuantity(code, quantity) ? ` x ${quantity}` : ''}
        </Badge>
      ))}
    </div>
  )
}
