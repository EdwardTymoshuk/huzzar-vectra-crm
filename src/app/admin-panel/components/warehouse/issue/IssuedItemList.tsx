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
import { IssuedItem, IssuedItemDevice, IssuedItemMaterial } from '@/types'
import { useState } from 'react'

type Props = {
  items: IssuedItem[]
  onRemoveItem: (index: number) => void
  onClearAll: () => void
  onIssue: () => void
}

const IssuedItemList = ({
  items,
  onRemoveItem,
  onClearAll,
  onIssue,
}: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const devices = items.filter((i) => i.type === 'DEVICE')
  const materials = items.filter((i) => i.type === 'MATERIAL')

  if (items.length === 0) return null

  return (
    <div className="space-y-4 mt-4 bg-gray-100 p-4 rounded-lg">
      <h2 className="text-lg font-bold">Do wydania:</h2>
      {/* Devices */}
      {devices.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-2">
            Urządzenia ({devices.length})
          </h4>
          <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
            {devices.map((item, idx) => {
              const device = item as IssuedItemDevice
              return (
                <li
                  key={`device-${idx}`}
                  className="border rounded p-2 flex justify-between items-center"
                >
                  <span>
                    {device.category} | {device.name} | SN:{' '}
                    {device.serialNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger hover:text-background"
                    onClick={() => onRemoveItem(items.indexOf(device))}
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
          <h4 className="text-md font-semibold mb-2">
            Materiały ({materials.length})
          </h4>
          <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
            {materials.map((item, idx) => {
              const material = item as IssuedItemMaterial
              return (
                <li
                  key={`material-${idx}`}
                  className="border rounded p-2 flex justify-between items-center"
                >
                  <span>
                    {material.name} | Ilość:{' '}
                    <Badge variant="outline">{material.quantity}</Badge>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger hover:text-background"
                    onClick={() => onRemoveItem(items.indexOf(material))}
                  >
                    Usuń
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="success" onClick={onIssue}>
          Wydaj sprzęt
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="danger"
              // className="text-danger hover:bg-danger border-danger hover:text-primary-foreground"
            >
              Wyczyść wszystko
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

        {/* Docelowo przycisk "Wydaj" będzie tutaj */}
      </div>
    </div>
  )
}

export default IssuedItemList
