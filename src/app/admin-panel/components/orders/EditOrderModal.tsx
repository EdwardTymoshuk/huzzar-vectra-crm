'use client'

import { orderSchema } from '@/app/(modules)/vectra-crm/lib/schema'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Form } from '@/app/components/ui/form'
import { OrderFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { Prisma, VectraOrderStatus } from '@prisma/client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { OrderFormFields } from '../../../components/shared/orders/OrderFormFields'

type OrderWithAssignedTo = Prisma.OrderGetPayload<{
  include: {
    assignedTo: { select: { id: true; name: true } }
  }
}>

/**
 * EditOrderModal
 * ----------------------------------------------------------
 * Displays a modal form to edit an existing order.
 * - Uses the same OrderFormFields component.
 * - Handles toast notifications for success and detailed errors.
 * - Ensures consistent status updates (ASSIGNED / PENDING).
 */
const EditOrderModal = ({
  open,
  onCloseAction,
  order,
}: {
  open: boolean
  onCloseAction: () => void
  order: OrderWithAssignedTo
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()

  /**
   * tRPC mutation — includes detailed error handling for Prisma/TRPC errors.
   */
  const updateOrderMutation = trpc.order.editOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało zapisane.')
      utils.order.getUnassignedOrders.invalidate()
      utils.order.getAssignedOrders.invalidate()
      utils.order.getOrderById.invalidate({ id: order.id })
      onCloseAction()
    },
    onError: (err) => {
      console.error('[editOrder error]', err)

      if (err.data?.code === 'NOT_FOUND') {
        toast.error('Zlecenie nie istnieje lub zostało usunięte.')
      } else if (err.data?.code === 'CONFLICT') {
        toast.error('Nie można użyć tego numeru zlecenia — jest już zajęty.')
      } else if (err.data?.code === 'BAD_REQUEST') {
        toast.error('Nieprawidłowe dane w formularzu.')
      } else {
        toast.error('Wystąpił nieoczekiwany błąd podczas zapisu.')
      }

      setIsSubmitting(false)
    },
  })

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      type: order.type,
      operator: order.operator,
      clientId: order.clientId || undefined,
      orderNumber: order.orderNumber,
      date: new Date(order.date).toISOString().split('T')[0],
      timeSlot: order.timeSlot,
      city: order.city,
      street: order.street,
      postalCode: order.postalCode || '',
      notes: order.notes || '',
      assignedToId: order.assignedToId || 'none',
      status: order.status || VectraOrderStatus.PENDING,
    },
  })

  const assignedToId = form.watch('assignedToId')

  /**
   * Handles submission logic for editing existing orders.
   */
  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true)

    try {
      let finalStatus = data.status

      // Automatically set ASSIGNED if technician changed from none
      if (data.assignedToId !== order.assignedToId) {
        if (order.status === VectraOrderStatus.PENDING) {
          finalStatus = VectraOrderStatus.ASSIGNED
        }
      }

      await updateOrderMutation.mutateAsync({
        id: order.id,
        ...data,
        status: finalStatus,
        assignedToId:
          data.assignedToId === 'none' ? undefined : data.assignedToId,
      })
    } catch (error) {
      console.error('Nieoczekiwany błąd onSubmit:', error)
      toast.error('Nieoczekiwany błąd podczas aktualizacji zlecenia.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Auto-change status to ASSIGNED if technician is selected.
   */
  useEffect(() => {
    const currentStatus = form.getValues('status')
    if (
      assignedToId &&
      assignedToId !== 'none' &&
      currentStatus === VectraOrderStatus.PENDING
    ) {
      form.setValue('status', VectraOrderStatus.ASSIGNED)
    }
  }, [assignedToId, form])

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj zlecenie</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <OrderFormFields form={form} isAdmin />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCloseAction}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditOrderModal
