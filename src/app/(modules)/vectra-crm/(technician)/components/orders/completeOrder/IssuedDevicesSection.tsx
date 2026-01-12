'use client'

import DeviceSummaryRow from '@/app/(modules)/vectra-crm/(technician)/components/orders/completeOrder/DeviceSummaryRow'
import SerialScanInput from '@/app/(modules)/vectra-crm/components/SerialScanInput'
import { Switch } from '@/app/components/ui/switch'
import { IssuedItemDevice } from '@/types/vectra-crm'

type Props = {
  enabled: boolean
  onToggle: (on: boolean) => void
  deviceOptions: IssuedItemDevice[]
  selected: IssuedItemDevice[]
  onAdd: (d: IssuedItemDevice) => void
  onRemove: (id: string) => void
}

/**
 * -----------------------------------------------------------------------------
 * Reusable block for picking and listing devices issued during a service order.
 * Props are intentionally minimal to keep parent business-logic in control.
 */

const IssuedDevicesSection: React.FC<Props> = ({
  enabled,
  onToggle,
  deviceOptions,
  selected,
  onAdd,
  onRemove,
}) => {
  return (
    <div className="pt-4 space-y-2">
      <div className="flex items-center gap-3">
        <Switch
          id="issued-switch"
          checked={enabled}
          onCheckedChange={onToggle}
        />
        <label htmlFor="issued-switch" className="font-semibold">
          Wydane urządzenia
        </label>
      </div>

      {enabled && (
        <>
          <h4 className="font-semibold">Skaner / wybór urządzenia</h4>
          <SerialScanInput
            devices={deviceOptions}
            onAddDevice={onAdd}
            variant="block"
          />

          {selected.map((d) => (
            <DeviceSummaryRow
              key={d.id}
              device={d}
              onRemove={() => onRemove(d.id)}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default IssuedDevicesSection
