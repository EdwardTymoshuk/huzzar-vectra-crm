'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Form } from '@/app/components/ui/form'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { OrderStatus, Prisma } from '@prisma/client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { OrderFormData, OrderFormFields, orderSchema } from './OrderFormFields'

/**
 * Define a type for the order with assigned technician info, etc.
 */
type OrderWithAssignedTo = Prisma.OrderGetPayload<{
  include: {
    assignedTo: {
      select: {
        id: true
        name: true
      }
    }
  }
}>

/**
 * EditOrderModal:
 * Displays a modal for editing an existing order.
 * Uses the same OrderFormFields but with default values
 * derived from the 'order' prop.
 *
 * Comments in English, UI labels in Polish.
 */
const EditOrderModal = ({
  open,
  onCloseAction, // renamed to match Next.js guidance about server/client actions
  order,
}: {
  open: boolean
  onCloseAction: () => void
  order: OrderWithAssignedTo
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()

  // tRPC update mutation
  const updateOrderMutation = trpc.order.editOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało zaktualizowane!')
      utils.order.getOrders.invalidate()
      onCloseAction()
    },
    onError: () => toast.error('Błąd podczas aktualizacji zlecenia.'),
  })

  /**
   * Prepare default values for the form.
   * Some fields might be null in DB => fallback to '' or 'none'.
   * Convert equipmentNeeded (string[]) -> comma-separated string.
   */
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      type: order.type,
      operator: order.operator,
      orderNumber: order.orderNumber,
      date: new Date(order.date).toISOString().split('T')[0],
      timeSlot: order.timeSlot,
      contractRequired: order.contractRequired,
      city: order.city,
      street: order.street,
      postalCode: order.postalCode,
      county: order.county || '',
      municipality: order.municipality || '',
      clientPhoneNumber: order.clientPhoneNumber || '',
      notes: order.notes || '',
      equipmentNeeded: order.equipmentNeeded
        ? order.equipmentNeeded.join(', ')
        : '',
      assignedToId: order.assignedToId || 'none',
      status: order.status || OrderStatus.PENDING,
    },
  })

  const assignedToId = form.watch('assignedToId')

  /**
   * Handle form submission to update existing order.
   * Convert equipmentNeeded from comma-separated string to string[],
   * fallback status if needed, etc.
   */
  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true)

    // Convert to array
    const equipmentArr = data.equipmentNeeded
      ? data.equipmentNeeded
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    // Fallback to 'PENDING' if there's no status
    let finalStatus = data.status

    if (data.assignedToId !== order.assignedToId) {
      // Jeśli status był NIE PRZYPISANE, zmień na PRZYPISANE
      if (order.status === OrderStatus.PENDING) {
        finalStatus = OrderStatus.ASSIGNED
      }
    }

    await updateOrderMutation.mutateAsync({
      id: order.id,
      ...data,
      status: finalStatus,
      equipmentNeeded: equipmentArr,
      assignedToId:
        data.assignedToId === 'none' ? undefined : data.assignedToId,
    })

    setIsSubmitting(false)
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
          <DialogTitle>Edytuj zlecenie</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Reusable form fields */}
            <OrderFormFields control={form.control} />

            {/* Action buttons */}
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
