'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { WarehouseFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'
import WarehouseSelectedItemsPanel from '../WarehouseSelectedItemsPanel'
import AddItemForm from './AddItemForm'

const AddModal = ({
  open,
  onCloseAction,
}: {
  open: boolean
  onCloseAction: () => void
}) => {
  const [items, setItems] = useState<WarehouseFormData[]>([])
  const [notes, setNotes] = useState('') // 📝 Local state for optional notes

  const utils = trpc.useUtils()

  const addMutation = trpc.warehouse.addItems.useMutation({
    onSuccess: () => {
      toast.success('Sprzęt został przyjęty na magazyn.')
      utils.warehouse.getAll.invalidate()
      setItems([])
      setNotes('') // 🔄 Clear notes after successful mutation
      onCloseAction()
    },
    onError: () => toast.error('Błąd podczas zapisywania sprzętu.'),
  })

  const handleAddItem = (item: WarehouseFormData) => {
    setItems((prev) => [...prev, item])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClearAll = () => {
    setItems([])
    setNotes('') // 🔄 Clear notes on clear all
  }

  const handleSave = () => {
    if (items.length === 0) {
      toast.warning('Dodaj przynajmniej jeden element.')
      return
    }
    addMutation.mutate({ items, notes }) // 📤 Send optional notes to backend
  }

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Przyjęcie do magazynu</DialogTitle>
        </DialogHeader>

        <AddItemForm existingItems={items} onAddItem={handleAddItem} />

        {items.length > 0 && (
          <WarehouseSelectedItemsPanel
            items={items}
            onRemoveItem={handleRemoveItem}
            onClearAll={handleClearAll}
            onConfirm={handleSave}
            title="Do przyjęcia"
            confirmLabel="Zapisz w magazynie"
            showNotes // ✅ Enables textarea for comments
            notes={notes}
            setNotes={setNotes}
            loading={addMutation.isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddModal
