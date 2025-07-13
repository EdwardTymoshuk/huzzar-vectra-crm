'use client'

import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { devicesTypeMap } from '@/lib/constants'
import { IssuedItemDevice } from '@/types'
import { MdDelete } from 'react-icons/md'

type Props = {
  device: IssuedItemDevice
  label?: string // e.g., "NET", "DTV", "Router"
  onRemove?: (id: string) => void
  className?: string
  children?: React.ReactNode
}

/**
 * DeviceSummaryRow – Always renders as a Card.
 * If device.name is empty: shows only label.
 * If device.name exists: shows [LABEL | KATEGORIA NAZWA]
 * For Router: if label="Router", show "Router | NAZWA" (no category!).
 */
const DeviceSummaryRow = ({
  device,
  label,
  onRemove,
  className,
  children,
}: Props) => {
  // For router row: skip category
  const showJustLabelAndName =
    label === 'Router' && device.name && device.name.length > 0

  return (
    <Card className={`w-full ${className ?? ''}`}>
      <CardContent className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-semibold">
              {/* Only label if no device name */}
              {!device.name
                ? label ?? ''
                : showJustLabelAndName
                ? `${label} | ${device.name}`
                : label
                ? `${label} | ${devicesTypeMap[device.category]} ${device.name}`
                : `${devicesTypeMap[device.category]} ${device.name}`}
            </span>
            {device.serialNumber && (
              <span className="text-xs text-muted-foreground">
                SN: {device.serialNumber}
              </span>
            )}
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="text-danger"
              onClick={() => onRemove(device.id)}
            >
              <MdDelete />
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export default DeviceSummaryRow
