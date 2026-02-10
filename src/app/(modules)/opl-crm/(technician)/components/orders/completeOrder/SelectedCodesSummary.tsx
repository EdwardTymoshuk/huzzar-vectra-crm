'use client'

import { oplActivationLabelMap } from '@/app/(modules)/opl-crm/lib/constants'
import { calculateDigAddons } from '@/app/(modules)/opl-crm/utils/order/calculateDigAddons'
import {
  ALL_ADDON_CODES,
  ALL_BASE_CODES,
} from '@/app/(modules)/opl-crm/utils/order/completeOrderHelper'
import { Badge } from '@/app/components/ui/badge'
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
  /* ---------------- BASE ---------------- */

  const base = value.find((v) => ALL_BASE_CODES.includes(v.code as any))?.code

  const activation = value.find((v) =>
    Object.prototype.hasOwnProperty.call(oplActivationLabelMap, v.code)
  )?.code as keyof typeof oplActivationLabelMap | undefined

  const isZjBase = base === 'ZJD' || base === 'ZJN' || base === 'ZJK'

  /* ---------------- ADDONS ---------------- */

  const addons = value.filter(
    (v) =>
      ALL_ADDON_CODES.includes(v.code as any) &&
      v.code !== 'MR' &&
      !['ZJDD', 'ZJKD', 'ZJND'].includes(v.code)
  )

  const mr = value.find((v) => v.code === 'MR')

  /* ---------------- DIG (DERIVED) ---------------- */

  const digAddons = digInput ? calculateDigAddons(digInput) : {}

  const digEntries = Object.entries(digAddons).filter(([, qty]) => qty > 0)

  /* ---------------- PKI ---------------- */

  const pkis = value.filter((v) => v.code.startsWith('PKI'))

  return (
    <div className="flex flex-wrap gap-2">
      {/* BASE */}
      {base && <Badge className="px-5 py-2 text-sm">{base}</Badge>}

      {/* ACTIVATION */}
      {activation && (
        <Badge className="px-5 py-2 text-sm">
          {oplActivationLabelMap[activation]}
        </Badge>
      )}

      {/* AUTO ZJWEW */}
      {isZjBase && <Badge className="px-5 py-2 text-sm">ZJWEW</Badge>}

      {/* ADDONS */}
      {addons.map(({ code }) => (
        <Badge key={code} className="px-5 py-2 text-sm">
          {code}
        </Badge>
      ))}

      {/* MR */}
      {mr && <Badge className="px-5 py-2 text-sm">MR ×{mr.quantity}</Badge>}

      {/* DIG ADDONS (COUNT ONLY) */}
      {digEntries.map(([code, quantity]) => (
        <Badge key={code} className="px-5 py-2 text-sm">
          {code} ×{quantity}
        </Badge>
      ))}

      {/* PKI */}
      {pkis.map(({ code, quantity }) => (
        <Badge key={code} className="px-5 py-2 text-sm">
          <span className="font-semibold">{code}</span> ×{quantity}
        </Badge>
      ))}
    </div>
  )
}
