'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'

type Props = {
  open: boolean
  orderId: string
  onClose: () => void
}

const TransferOrderModal = ({ open, orderId, onClose }: Props) => {
  const [technicianId, setTechnicianId] = useState<string | null>(null)

  const { data: technicians = [] } = trpc.user.getOtherTechnicians.useQuery({})
  const requestTransfer = trpc.order.requestTransfer.useMutation({
    onSuccess: () => {
      trpcUtils.order.getOrders.invalidate()
      onClose()
    },
  })
  const trpcUtils = trpc.useUtils()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Przekaż zlecenie</DialogTitle>
        </DialogHeader>

        <Select onValueChange={(v) => setTechnicianId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Wybierz technika" />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            disabled={!technicianId}
            onClick={() =>
              requestTransfer.mutate({
                orderId,
                newTechnicianId: technicianId!,
              })
            }
          >
            Przekaż
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TransferOrderModal
