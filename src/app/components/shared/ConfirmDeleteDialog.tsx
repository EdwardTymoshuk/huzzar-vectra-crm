'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  description?: string
}

/**
 * ConfirmDeleteDialog:
 * - A reusable confirmation dialog.
 * - Displays a warning message and two buttons: cancel & confirm.
 */
const ConfirmDeleteDialog = ({
  open,
  onClose,
  onConfirm,
  description = 'Ta operacja jest nieodwracalna. Czy na pewno chcesz kontynuować?',
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potwierdź usunięcie</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{description}</p>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Usuń
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDeleteDialog
