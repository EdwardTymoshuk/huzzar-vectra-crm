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
import { OrderStatus } from '@prisma/client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { OrderFormFields } from './OrderFormFields'

/**
 * AddOrderModal component:
 * - Renders a form for creating a new order
 * - Uses Hook Form and Zod for validation
 * - Clears the form on successful submission
 * - Closes the modal after creation, or reverts to normal state on error
 *
 * @param open - Determines if the modal is open or closed
 * @param onCloseAction - Function to close the modal (renamed to match Next.js client action)
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

  // tRPC mutation for creating an order
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
   * - Falls back to 'PENDING' if status is not provided
   * - On success, shows a toast, invalidates the orders list, resets the form, and closes the modal
   * - On error, shows a toast and reverts the submit button state
   */
  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true)

    // If no status is given, default to 'PENDING'
    const finalStatus =
      data.assignedToId && (!data.status || data.status === OrderStatus.PENDING)
        ? OrderStatus.ASSIGNED
        : data.status

    try {
      await createOrderMutation.mutateAsync({
        ...data,
        status: finalStatus,
        assignedToId:
          data.assignedToId === 'none' ? undefined : data.assignedToId,
      })

      toast.success('Zlecenie zostało dodane!')
      utils.order.getOrders.invalidate()

      // Reset the form and close the modal
      form.reset()
      onCloseAction()
    } catch {
      toast.error('Błąd podczas dodawania zlecenia.')
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
            {/* Reusable fields for the order */}
            <OrderFormFields form={form} />

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
