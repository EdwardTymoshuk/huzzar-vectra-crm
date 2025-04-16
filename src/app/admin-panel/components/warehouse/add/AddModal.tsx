'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { ItemFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'
import AddItemForm from './AddItemForm'
import AddedItemList from './AddedItemList'

const AddModal = ({
  open,
  onCloseAction,
}: {
  open: boolean
  onCloseAction: () => void
}) => {
  const [items, setItems] = useState<ItemFormData[]>([])

  const utils = trpc.useUtils()
  const addMutation = trpc.warehouse.addItems.useMutation({
    onSuccess: () => {
      toast.success('Sprzęt został przyjęty na magazyn.')
      utils.warehouse.getAll.invalidate()
      setItems([])
      onCloseAction()
    },
    onError: () => toast.error('Błąd podczas zapisywania sprzętu.'),
  })

  const handleAddItem = (item: ItemFormData) => {
    setItems((prev) => [...prev, item])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClearAll = () => {
    setItems([])
  }

  const handleSave = () => {
    if (items.length === 0)
      return toast.warning('Dodaj przynajmniej jeden element.')
    addMutation.mutate({ items })
  }

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Przyjęcie do magazynu</DialogTitle>
        </DialogHeader>

        <AddItemForm existingItems={items} onAddItem={handleAddItem} />

        {items.length > 0 && (
          <AddedItemList
            items={items}
            onRemoveItem={handleRemoveItem}
            onClearAll={handleClearAll}
            onSave={handleSave}
            loading={addMutation.isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddModal
