'use client'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { X } from 'lucide-react'

import type { OplDeviceCategory } from '@prisma/client'

/* ------------------------------------------------------------------ */
/* TYPES                                                              */
/* ------------------------------------------------------------------ */

export type OplEquipmentDraftItem = {
  clientId: string
  deviceDefinitionId: string | null
  name: string
  category: OplDeviceCategory
  serial: string
}

type Props = {
  /** Draft item from CompleteOplOrderContext */
  item: OplEquipmentDraftItem

  /** issued | collected (UI only, no logic branching) */
  mode: 'issued' | 'collected'

  /** Patch updater */
  onChange: (patch: Partial<OplEquipmentDraftItem>) => void

  /** Remove item from draft */
  onRemove: () => void
}

/**
 * OplEquipmentDraftRow
 * ------------------------------------------------------------
 * Single row representing issued or collected equipment
 * in OPL order completion wizard.
 *
 * This component is UI-only:
 * - no backend access
 * - no warehouse validation
 * - no source awareness (warehouse / technician)
 */
const OplEquipmentDraftRow = ({ item, mode, onChange, onRemove }: Props) => {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center">
      {/* ---------------------------------------------------------- */}
      {/* DEVICE INFO                                               */}
      {/* ---------------------------------------------------------- */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>

          <Badge variant="secondary" className="text-xs">
            {item.category}
          </Badge>

          {mode === 'collected' && (
            <Badge variant="outline" className="text-xs">
              odebrany
            </Badge>
          )}
        </div>

        {/* SERIAL INPUT */}
        <Input
          value={item.serial}
          onChange={(e) =>
            onChange({
              serial: e.target.value.toUpperCase(),
            })
          }
          placeholder="Numer seryjny"
          className="max-w-xs [text-transform:uppercase]"
        />
      </div>

      {/* ---------------------------------------------------------- */}
      {/* ACTIONS                                                   */}
      {/* ---------------------------------------------------------- */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Usuń sprzęt"
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  )
}

export default OplEquipmentDraftRow
