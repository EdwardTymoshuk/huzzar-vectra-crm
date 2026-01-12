'use client'

import { Button } from '@/app/components/ui/button'
import { IssuedItemDevice } from '@/types/vectra-crm'

/**
 * DeviceCard
 * Small confirmation card for a selected warehouse device.
 * Shows name + SN/MAC and provides a remove action.
 */
interface Props {
  label: string
  device: IssuedItemDevice
  onRemove?: () => void
}

const DeviceCard = ({ label, device, onRemove }: Props) => {
  return (
    <div className="flex items-center justify-between border rounded-md bg-muted/30 px-3 py-2 mt-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {device.name} — SN/MAC: {device.serialNumber ?? 'Brak'}
        </span>
      </div>
      {onRemove && (
        <Button size="sm" variant="destructive" onClick={onRemove}>
          Usuń
        </Button>
      )}
    </div>
  )
}

export default DeviceCard
