'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { OrderCreatedSource, OrderStatus } from '@prisma/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { technicianOrderSchema } from '@/lib/schema'
import { TechnicianOrderFormData } from '@/types'
import { trpc } from '@/utils/trpc'

import { OrderFormFields } from '@/app/admin-panel/components/orders/OrderFormFields'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Form } from '@/app/components/ui/form'
import { useSession } from 'next-auth/react'

/**
 * TechnicianAddOrderModal:
 * Modal used by technician to add a simplified order
 * On success, redirects to edit page of the created order
 */
export const TechnicianAddOrderModal = ({
  open,
  onCloseAction,
  onCreated,
}: {
  open: boolean
  onCloseAction: () => void
  onCreated?: (id: string) => void
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: session } = useSession()
  const utils = trpc.useUtils()

  // Create order mutation
  const createOrderMutation = trpc.order.createOrder.useMutation()

  // Form setup with simplified defaults
  const form = useForm<TechnicianOrderFormData>({
    resolver: zodResolver(technicianOrderSchema),
    defaultValues: {
      type: 'INSTALATION',
      orderNumber: '',
      date: new Date().toISOString().split('T')[0],
      timeSlot: 'EIGHT_TEN',
      city: '',
      street: '',
      notes: '',
      status: OrderStatus.PENDING,
    },
  })

  const onSubmit = async (data: TechnicianOrderFormData) => {
    setIsSubmitting(true)

    try {
      const createdOrder = await createOrderMutation.mutateAsync({
        ...data,
        postalCode: '00-000',
        assignedToId: session?.user.id,
        status: OrderStatus.ASSIGNED,
        createdSource: OrderCreatedSource.MANUAL,
      })

      toast.success('Zlecenie zostało dodane!')
      form.reset()
      utils.order.getTechnicianActiveOrders.invalidate()
      onCloseAction()
      onCreated?.(createdOrder.id)
    } catch (error) {
      /**
       * Display detailed backend error in toast
       * - TRPC errors contain `message`
       * - Prisma duplicate key errors can be parsed from message
       */
      let errorMessage = 'Wystąpił błąd przy dodawaniu zlecenia.'

      if (error instanceof Error) {
        if (error.message.includes('Unique constraint failed')) {
          errorMessage = 'Numer zlecenia już istnieje. Wprowadź inny numer.'
        } else if ('message' in error) {
          errorMessage = error.message
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
            {/* Form fields specific to technician */}
            <OrderFormFields form={form} />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCloseAction}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Dodawanie...' : 'Dodaj'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default TechnicianAddOrderModal
