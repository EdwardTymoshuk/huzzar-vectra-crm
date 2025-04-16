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
import { Button } from '@/app/components/ui/button'
import { ItemFormData } from '@/types'

const AddedItemList = ({
  items,
  onRemoveItem,
  onClearAll,
  onSave,
  loading,
}: {
  items: ItemFormData[]
  onRemoveItem: (index: number) => void
  onClearAll: () => void
  onSave: () => void
  loading: boolean
}) => {
  return (
    <div className="space-y-4 mt-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="border rounded p-2 flex justify-between items-center text-sm"
        >
          <span>
            {item.type === 'DEVICE'
              ? `${item.name} | SN: ${item.serialNumber}`
              : `${item.name} | Ilość: ${item.quantity}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger hover:text-background"
            onClick={() => onRemoveItem(idx)}
          >
            Usuń
          </Button>
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-danger hover:bg-danger border-danger hover:text-primary-foreground"
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
        <Button variant="success" disabled={loading} onClick={onSave}>
          {loading ? 'Zapisywanie...' : 'Zapisz w magazynie'}
        </Button>
      </div>
    </div>
  )
}

export default AddedItemList
