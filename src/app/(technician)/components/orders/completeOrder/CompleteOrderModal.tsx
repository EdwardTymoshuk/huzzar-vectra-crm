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
import { Textarea } from '@/app/components/ui/textarea'
import { SelectedCode } from '@/types'
import { trpc } from '@/utils/trpc'
import { OrderStatus, OrderType } from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'
import EquipmentSelector from './EquipmentSelector'
import MaterialSelector from './MaterialSelector'
import WorkCodeSelector from './WorkCodeSelector'

type Props = {
  open: boolean
  orderId: string
  onClose: () => void
  orderType: OrderType
}

/**
 * CompleteOrderModal is a dialog for completing or rejecting an order.
 * - Allows the user to mark the order as completed or not completed.
 * - For completed orders: user can select work codes, equipment, and materials used.
 * - For not completed orders: user must enter a failure reason.
 * - Notes (comments) are optional in both cases.
 * - All required data is loaded at once to enable a shared loading state and Skeleton.
 */
const CompleteOrderModal = ({ open, onClose, orderId, orderType }: Props) => {
  // Modal state for status, notes, failure reason, work codes, materials, and equipment
  const [status, setStatus] = useState<OrderStatus>('COMPLETED')
  const [notes, setNotes] = useState('')
  const [failureReason, setFailureReason] = useState('')

  const [workCodes, setWorkCodes] = useState<SelectedCode[]>([])
  const [materials, setMaterials] = useState<
    { id: string; quantity: number }[]
  >([])
  const [equipment, setEquipment] = useState<string[]>([])

  // TRPC utils for cache invalidation
  const utils = trpc.useUtils()

  // Mutation for completing the order
  const mutation = trpc.order.completeOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało zaktualizowane.')
      utils.order.getOrders.invalidate()
      utils.order.getOrderById.invalidate({ id: orderId })
      onClose()
    },
    onError: () => toast.error('Błąd zapisu zlecenia.'),
  })

  // Fetch all required data upfront to enable shared loading skeleton
  const {
    data: workCodeDefs,
    isLoading: loadingCodes,
    isError: errorCodes,
  } = trpc.rateDefinition.getAllRates.useQuery()

  const {
    data: technicianMaterials,
    isLoading: loadingMaterialStock,
    isError: errorMaterialStock,
  } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'MATERIAL',
  })

  const {
    data: materialDefs,
    isLoading: loadingMaterialDefs,
    isError: errorMaterialDefs,
  } = trpc.materialDefinition.getAll.useQuery()

  const {
    data: technicianDevices,
    isLoading: loadingDeviceStock,
    isError: errorDeviceStock,
  } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'DEVICE',
  })

  const isLoading =
    loadingCodes ||
    loadingMaterialStock ||
    loadingMaterialDefs ||
    loadingDeviceStock

  const isError =
    errorCodes || errorMaterialStock || errorMaterialDefs || errorDeviceStock

  /**
   * Handles the form submission.
   * Validates required fields before calling the mutation.
   * - If completed, requires at least one work code.
   * - Submits status, notes, failure reason, work codes, equipment, and materials.
   */
  const handleSubmit = () => {
    if (
      status === 'COMPLETED' &&
      orderType !== 'SERVICE' &&
      workCodes.length === 0
    ) {
      return toast.error('Wybierz przynajmniej jeden kod pracy.')
    }

    mutation.mutate({
      orderId,
      status,
      notes: notes || null,
      failureReason: status === 'NOT_COMPLETED' ? failureReason : null,
      workCodes: workCodes.map((c) => ({ code: c.code, quantity: c.quantity })),
      equipmentIds: equipment,
      usedMaterials: materials,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="
          max-w-lg md:max-w-2xl w-[95vw] min-w-0
          flex flex-col gap-4
          overflow-x-hidden
        "
      >
        <DialogHeader>
          <DialogTitle>Zakończ zlecenie</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 w-full">
          {/* Status toggle buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              variant={status === 'COMPLETED' ? 'default' : 'outline'}
              onClick={() => setStatus('COMPLETED')}
            >
              Wykonane
            </Button>
            <Button
              variant={status === 'NOT_COMPLETED' ? 'default' : 'outline'}
              onClick={() => setStatus('NOT_COMPLETED')}
            >
              Niewykonane
            </Button>
          </div>

          {/* Shared loading skeleton for completed order inputs */}
          {status === 'COMPLETED' && (
            <>
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-6 bg-muted rounded w-32" />
                  <div className="h-12 bg-muted rounded" />
                  <div className="h-12 bg-muted rounded" />
                  <div className="h-24 bg-muted rounded" />
                </div>
              ) : isError ? (
                <p className="text-danger">Błąd ładowania danych.</p>
              ) : (
                <>
                  {orderType !== 'SERVICE' && (
                    <WorkCodeSelector
                      selected={workCodes}
                      setSelected={setWorkCodes}
                      codes={workCodeDefs ?? []}
                    />
                  )}
                  <EquipmentSelector
                    selected={equipment}
                    setSelected={setEquipment}
                    devices={technicianDevices ?? []}
                  />
                  <MaterialSelector
                    selected={materials}
                    setSelected={setMaterials}
                    materials={materialDefs ?? []}
                    technicianStock={technicianMaterials ?? []}
                  />
                </>
              )}
            </>
          )}

          {/* Failure reason input if status is NOT_COMPLETED */}
          {status === 'NOT_COMPLETED' && (
            <Input
              placeholder="Podaj powód niewykonania"
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
            />
          )}

          {/* Notes input (always visible) */}
          <Textarea
            placeholder="Uwagi (opcjonalnie)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Zapisywanie...' : 'Zapisz i zakończ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteOrderModal
