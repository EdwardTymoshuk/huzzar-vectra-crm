'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { devicesTypeMap } from '@/lib/constants'
import {
  IssuedItemDevice,
  IssuedItemMaterial,
  WarehouseFormData,
} from '@/types'
import { useState } from 'react'

type Props = {
  items: WarehouseFormData[]
  onRemoveItem: (index: number) => void
  onClearAll: () => void
  onConfirm: () => void
  loading?: boolean
  title: string
  confirmLabel: string
  showNotes?: boolean
  notes?: string
  setNotes?: (v: string) => void
}

const WarehouseSelectedItemsPanel = ({
  items,
  onRemoveItem,
  onClearAll,
  onConfirm,
  loading,
  title,
  confirmLabel,
  showNotes = false,
  notes,
  setNotes,
}: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const devices = items.filter((i) => i.type === 'DEVICE')
  const materials = items.filter((i) => i.type === 'MATERIAL')

  return (
    <div className="space-y-4 bg-gray-100 p-4 rounded-lg mt-4">
      <h2 className="text-lg font-bold">{title}</h2>

      {/* Devices */}
      {devices.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-2 text-primary">
            Urządzenia ({devices.length})
          </h4>
          <ul className="space-y-1 text-sm">
            {devices.map((item, idx) => {
              const d = item as IssuedItemDevice
              return (
                <li
                  key={`device-${idx}`}
                  className="flex justify-between items-center border rounded p-2"
                >
                  <span>
                    {devicesTypeMap[d.category]} | {d.name} | SN:{' '}
                    {d.serialNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger hover:text-background"
                    onClick={() => onRemoveItem(items.indexOf(item))}
                  >
                    Usuń
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Materials */}
      {materials.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-2 text-primary">
            Materiały ({materials.length})
          </h4>
          <ul className="space-y-1 text-sm">
            {materials.map((item, idx) => {
              const m = item as IssuedItemMaterial
              return (
                <li
                  key={`material-${idx}`}
                  className="flex justify-between items-center border rounded p-2"
                >
                  <span>
                    {m.name} | Ilość:{' '}
                    <Badge variant="outline">{m.quantity}</Badge>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger hover:text-background"
                    onClick={() => onRemoveItem(items.indexOf(item))}
                  >
                    Usuń
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Notes (optional) */}
      {showNotes && setNotes && (
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            Uwagi (opcjonalnie)
          </label>
          <textarea
            className="w-full border rounded-md p-2 text-sm resize-none"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dodaj uwagi do operacji (np. numer dokumentu, powód, opis)"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onConfirm} disabled={loading} variant="success">
          {loading ? `${confirmLabel}...` : confirmLabel}
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-danger hover:bg-danger border-danger hover:text-primary-foreground"
            >
              Wyczyść
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Czy na pewno chcesz usunąć wszystkie pozycje?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={onClearAll}>
                Wyczyść
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export default WarehouseSelectedItemsPanel
