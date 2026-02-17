'use client'

import { orderSchema } from '@/app/(modules)/opl-crm/lib/schema'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Form } from '@/app/components/ui/form'
import { OplOrderFormData } from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  OplNetworkOeprator,
  OplOrderCreatedSource,
  OplOrderStatus,
  OplOrderType,
  OplTimeSlot,
} from '@prisma/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { OplOrderFormFields } from '../../../components/order/OplOrderFormFields'

/**
 * AddOplOrderModal
 * ---------------------------------------------------------------------------
 * Modal for creating a new OPL order (manual creation by admin/coordinator).
 *
 * Responsibilities:
 * - Initializes the form with default values
 * - Submits validated data to backend via tRPC
 * - Displays success / error feedback
 *
 * NOTE:
 * - Technician assignment logic is fully handled inside OplOrderFormFields
 * - This component does NOT manipulate assignment or status directly
 */
export function AddOplOrderModal({
  open,
  onCloseAction,
}: {
  open: boolean
  onCloseAction: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()

  const createOrderMutation = trpc.opl.order.createOrder.useMutation()

  /**
   * React Hook Form setup
   */
  const form = useForm<OplOrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      type: OplOrderType.INSTALLATION,
      operator: undefined,
      serviceId: undefined,
      network: OplNetworkOeprator.ORANGE,
      clientPhoneNumber: undefined,
      orderNumber: '',
      date: '',
      timeSlot: OplTimeSlot.EIGHT_TEN,
      city: '',
      street: '',
      postalCode: '',
      notes: '',
      standard: undefined,
      assignedTechnicianIds: [],
      status: OplOrderStatus.PENDING,
      contractRequired: false,
    },
  })

  /**
   * Handles order creation
   */
  const onSubmit = async (data: OplOrderFormData) => {
    setIsSubmitting(true)

    try {
      await createOrderMutation.mutateAsync({
        ...data,
        createdSource: OplOrderCreatedSource.MANUAL,
      })

      toast.success('Zlecenie zostało pomyślnie dodane.')

      // Refresh relevant lists
      utils.opl.order.getAssignedOrders.invalidate()
      utils.opl.order.getUnassignedOrders.invalidate()

      form.reset()
      onCloseAction()
    } catch (err: unknown) {
      let errorMessage = 'Nie udało się dodać zlecenia.'

      if (err && typeof err === 'object' && 'data' in err) {
        const e = err as { message?: string; data?: { code?: string } }

        if (e.message) {
          errorMessage = e.message
        } else if (e.data?.code === 'CONFLICT') {
          errorMessage = 'Zlecenie o podanym numerze już istnieje.'
        } else if (e.data?.code === 'BAD_REQUEST') {
          errorMessage = 'Nieprawidłowe dane formularza.'
        } else if (e.data?.code === 'NOT_FOUND') {
          errorMessage = 'Nie znaleziono technika.'
        } else if (e.data?.code === 'FORBIDDEN') {
          errorMessage = 'Brak uprawnień do wykonania tej akcji.'
        }
      }

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nowe zlecenie</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Order form fields */}
            <OplOrderFormFields form={form} isAdmin />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCloseAction}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Dodawanie...' : 'Zapisz'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddOplOrderModal
