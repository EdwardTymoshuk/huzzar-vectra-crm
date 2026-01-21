'use client'

import { devicesTypeMap } from '@/app/(modules)/vectra-crm/lib/constants'
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
import {
  VectraIssuedItemDevice,
  VectraIssuedItemMaterial,
  WarehouseFormData,
} from '@/types/vectra-crm'

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
    <div className="space-y-5 bg-muted dark:bg-card text-card-foreground p-5 rounded-xl shadow ring-1 ring-muted/10 dark:ring-0">
      <h2 className="text-lg font-bold">{title}</h2>

      {/* ------------------ DEVICES ------------------ */}
      {devices.length > 0 && (
        <section className="">
          <h4 className="mb-3 font-semibold text-primary">
            Urządzenia <span className="opacity-70">({devices.length})</span>
          </h4>

          <ul className="space-y-2">
            {devices.map((item, idx) => {
              const d = item as VectraIssuedItemDevice
              return (
                <li
                  key={`device-${idx}`}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-2
                   rounded-lg p-3
                  bg-background dark:bg-card/50
                  ring-1 ring-muted/30 dark:ring-muted/20"
                >
                  <div className="flex flex-col text-sm">
                    <span className="font-medium">
                      {devicesTypeMap[d.category]} | {d.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      SN:&nbsp;{d.serialNumber}
                    </span>
                  </div>

                  <Button
                    variant="outline"
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
        </section>
      )}

      {/* ------------------ MATERIALS ------------------ */}
      {materials.length > 0 && (
        <section>
          <h4 className="mb-3 font-semibold text-primary">
            Materiały <span className="opacity-70">({materials.length})</span>
          </h4>

          <ul className="space-y-2">
            {materials.map((item, idx) => {
              const m = item as VectraIssuedItemMaterial
              return (
                <li
                  key={`material-${idx}`}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-2 border border-muted rounded-lg p-3 bg-background dark:bg-card/50"
                >
                  <div className="flex flex-col text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Ilość:&nbsp;
                      <Badge variant="outline">{m.quantity}</Badge>
                    </span>
                  </div>

                  <Button
                    variant="outline"
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
        </section>
      )}

      {/* ------------------ NOTES ------------------ */}
      {showNotes && setNotes && (
        <div>
          <label className="block mb-1 text-sm font-medium text-muted-foreground">
            Uwagi (opcjonalnie)
          </label>
          <textarea
            rows={3}
            className="w-full border border-muted rounded-lg bg-background dark:bg-card/50
ring-1 ring-muted/20 dark:ring-muted/30
 p-2 text-sm resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dodaj uwagi do operacji (np. numer dokumentu, powód, opis)"
          />
        </div>
      )}

      {/* ------------------ ACTIONS ------------------ */}
      <div className="flex justify-end gap-3 pt-2">
        <Button onClick={onConfirm} disabled={loading} variant="success">
          {loading ? `${confirmLabel}...` : confirmLabel}
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-danger border-danger hover:bg-danger hover:text-background"
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
