'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { PkiDefinition } from '@/types/opl-crm/orders'
import { useState } from 'react'

interface Props {
  open: boolean
  pki: PkiDefinition | null
  onClose: () => void
  onConfirm: (code: string, quantity: number) => void
}

const PkiQuantityDialog = ({ open, pki, onClose, onConfirm }: Props) => {
  const [qty, setQty] = useState(1)

  if (!pki) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pki.code}</DialogTitle>
          <p className="text-sm text-muted-foreground">{pki.label}</p>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Ilość</label>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            onClick={() => {
              onConfirm(pki.code, qty)
              onClose()
            }}
          >
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PkiQuantityDialog
