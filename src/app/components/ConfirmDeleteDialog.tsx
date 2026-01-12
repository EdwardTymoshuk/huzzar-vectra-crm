'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  description?: string
}

/**
 * ConfirmDeleteDialog:
 * -------------------------------------------------------------
 * A reusable confirmation dialog for delete actions.
 * - Displays a warning message.
 * - Shows a loading state ("Usuwanie...") during confirmation.
 * - Prevents duplicate clicks while processing.
 */
const ConfirmDeleteDialog = ({
  open,
  onClose,
  onConfirm,
  description = 'Ta operacja jest nieodwracalna. Czy na pewno chcesz kontynuować?',
}: Props) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsDeleting(true)
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potwierdź usunięcie</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{description}</p>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDeleteDialog
