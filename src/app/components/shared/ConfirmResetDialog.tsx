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

interface ConfirmResetDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title?: string
  description?: string
}

/**
 * ConfirmResetDialog
 * -------------------------------------------------------------
 * Reusable confirmation dialog for reset-type destructive actions.
 * - Used when user is about to remove or reset a large dataset.
 * - Blocks multiple clicks while confirming.
 */
const ConfirmResetDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Potwierdź reset',
  description = 'Ta operacja usunie wszystkie dane powiązane z bieżącą sekcją. Czy na pewno chcesz kontynuować?',
}: ConfirmResetDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsProcessing(true)
      await onConfirm()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{description}</p>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Resetowanie...' : 'Potwierdź reset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmResetDialog
