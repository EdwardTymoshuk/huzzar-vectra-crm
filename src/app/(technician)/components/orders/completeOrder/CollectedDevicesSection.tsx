// File: CollectedDevicesSection.tsx

'use client'

import DeviceSummaryRow from '@/app/(technician)/components/orders/completeOrder/DeviceSummaryRow'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { devicesTypeMap } from '@/lib/constants'
import { genUUID } from '@/utils/uuid'
import { DeviceCategory } from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'

export type CollectedDevice = {
  id: string
  name: string
  category: DeviceCategory
  serialNumber: string
}

/**
 * CollectedDevicesSection
 * -----------------------------------------------------------------------------
 * Handles simple inline form for adding devices collected from the client.
 * The component owns the small input state and produces a normalized object.
 */
const CollectedDevicesSection: React.FC<{
  enabled: boolean
  onToggle: (on: boolean) => void
  items: CollectedDevice[]
  onAdd: (d: CollectedDevice) => void
  onRemove: (id: string) => void
}> = ({ enabled, onToggle, items, onAdd, onRemove }) => {
  const [category, setCategory] = useState<DeviceCategory>('OTHER')
  const [name, setName] = useState('')
  const [serial, setSerial] = useState('')

  const add = () => {
    if (name.trim().length < 2) return toast.error('Podaj nazwę urządzenia.')
    if (serial.trim().length < 3) return toast.error('Podaj numer seryjny.')
    onAdd({
      id: genUUID(),
      name: name.trim(),
      category,
      serialNumber: serial.trim().toUpperCase(),
    })
    setName('')
    setSerial('')
  }

  return (
    <div className="pt-4 space-y-2">
      <div className="flex items-center gap-3">
        <Switch
          id="collect-switch"
          checked={enabled}
          onCheckedChange={onToggle}
        />
        <label htmlFor="collect-switch" className="font-semibold">
          Odebrano od klienta
        </label>
      </div>

      {enabled && (
        <>
          <div className="flex flex-col md:flex-row gap-2">
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as DeviceCategory)}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DeviceCategory).map((c) => (
                  <SelectItem key={c} value={c}>
                    {devicesTypeMap[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Nazwa urządzenia"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 [text-transform:uppercase]"
            />
            <Input
              placeholder="Numer seryjny"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="flex-1 md:w-44 [text-transform:uppercase]"
            />
            <Button onClick={add} disabled={!serial.trim()}>
              Dodaj
            </Button>
          </div>

          {items.map((d) => (
            <DeviceSummaryRow
              key={d.id}
              device={{
                id: d.id,
                type: 'DEVICE',
                name: d.name,
                serialNumber: d.serialNumber,
                category: d.category,
              }}
              onRemove={() => onRemove(d.id)}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default CollectedDevicesSection
