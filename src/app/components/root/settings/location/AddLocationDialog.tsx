'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * AddLocationDialog:
 * - Dialog form for adding a new warehouse location
 * - Shows toast feedback on success/error
 */
const AddLocationDialog = ({ open, onOpenChange }: Props) => {
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const utils = trpc.useUtils()

  const createLocation = trpc.vectra.warehouse.createLocation.useMutation({
    onSuccess: async () => {
      toast.success('Lokalizacja została dodana.')
      setId('')
      setName('')
      await utils.vectra.warehouse.getAllLocations.invalidate()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message || 'Nie udało się dodać lokalizacji.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createLocation.mutate({ id, name })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nową lokalizację magazynu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Identyfikator (np. gdansk)"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <Input
            placeholder="Nazwa (np. Gdańsk)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={createLocation.isLoading}>
            {createLocation.isLoading ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddLocationDialog
