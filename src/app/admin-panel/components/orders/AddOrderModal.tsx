'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Form } from '@/app/components/ui/form'
import { orderSchema } from '@/lib/schema'
import { OrderFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { OrderCreatedSource, OrderStatus } from '@prisma/client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { OrderFormFields } from '../../../components/shared/orders/OrderFormFields'

/**
 * AddOrderModal
 * ---------------------------------------------------------------------------
 * Modal for creating a new order (manual creation by admin/coordinator).
 * Uses React Hook Form + Zod validation and tRPC mutation with detailed feedback.
 */
export function AddOrderModal({
  open,
  onCloseAction,
}: {
  open: boolean
  onCloseAction: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()
  const createOrderMutation = trpc.order.createOrder.useMutation()

  // React Hook Form setup
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      type: 'INSTALATION',
      operator: 'VECTRA',
      orderNumber: '',
      date: '',
      timeSlot: 'EIGHT_TEN',
      city: '',
      street: '',
      postalCode: '',
      notes: '',
      assignedToId: 'none',
      status: OrderStatus.PENDING,
    },
  })

  const assignedToId = form.watch('assignedToId')

  /**
   * Handles the form submission:
   * - Automatically assigns status ASSIGNED if technician is chosen
   * - Displays detailed toasts on error (from TRPC)
   * - Resets and closes form on success
   */
  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true)
    try {
      await createOrderMutation.mutateAsync({
        ...data,
        assignedToId:
          data.assignedToId === 'none' ? undefined : data.assignedToId,
        createdSource: OrderCreatedSource.MANUAL,
      })

      toast.success('Zlecenie zostało pomyślnie dodane.')
      utils.order.getAssignedOrders.invalidate()
      utils.order.getUnassignedOrders.invalidate()

      form.reset()
      onCloseAction()
    } catch (err: unknown) {
      // Extract TRPC error message
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
          errorMessage = 'Nie znaleziono technika lub zlecenia.'
        } else if (e.data?.code === 'FORBIDDEN') {
          errorMessage = 'Brak uprawnień do wykonania tej akcji.'
        }
      }

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const currentStatus = form.getValues('status')
    if (
      assignedToId &&
      assignedToId !== 'none' &&
      currentStatus === OrderStatus.PENDING
    ) {
      form.setValue('status', OrderStatus.ASSIGNED)
    }
  }, [assignedToId, form])

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nowe zlecenie</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Form fields */}
            <OrderFormFields form={form} isAdmin />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCloseAction}>
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

export default AddOrderModal
