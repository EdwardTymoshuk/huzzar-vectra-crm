'use client'

import { oplActivationLabelMap } from '@/app/(modules)/opl-crm/lib/constants'
import { OplWorkCodesState } from '@/app/(modules)/opl-crm/utils/hooks/useOplWorkCodes'
import { calculateDigAddons } from '@/app/(modules)/opl-crm/utils/order/calculateDigAddons'
import { Badge } from '@/app/components/ui/badge'

/**
 * Displays selected work codes summary.
 * Read-only view.
 */
export const SelectedCodesSummary = ({
  state,
}: {
  state: OplWorkCodesState
}) => {
  const digAddons = state.digInput ? calculateDigAddons(state.digInput) : {}

  const isZjBase =
    state.base === 'ZJD' || state.base === 'ZJN' || state.base === 'ZJK'

  return (
    <div className="flex flex-wrap gap-2">
      {/* BASE */}
      {state.base && <Badge>{state.base}</Badge>}

      {/* ACTIVATION */}
      {state.activation && (
        <Badge>{oplActivationLabelMap[state.activation]}</Badge>
      )}

      {/* AUTO ZJWEW */}
      {isZjBase && <Badge>ZJWEW</Badge>}

      {/* MANUAL ADDONS */}
      {state.addons.map((code) => (
        <Badge key={code}>{code}</Badge>
      ))}

      {/* MR */}
      {state.mrCount > 0 && <Badge>MR ×{state.mrCount}</Badge>}

      {/* UMZ */}
      {state.umz && <Badge>UMZ</Badge>}

      {/* DIG DERIVED */}
      {Object.entries(digAddons).map(([code, qty]) =>
        qty > 0 ? (
          <Badge key={code}>
            {code} ×{qty}
          </Badge>
        ) : null
      )}
    </div>
  )
}
