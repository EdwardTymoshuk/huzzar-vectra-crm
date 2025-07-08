'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { OrderStatus } from '@prisma/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { technicianOrderSchema } from '@/lib/schema'
import { TechnicianOrderFormData } from '@/types'
import { trpc } from '@/utils/trpc'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Form } from '@/app/components/ui/form'
import { useSession } from 'next-auth/react'
import { OrderFormFieldsTechnician } from './OrderFormFieldsTechnician'

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
      date: '',
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
        operator: 'VCTR',
        contractRequired: false,
        postalCode: '00-000',
        equipmentNeeded: [],
        assignedToId: session?.user.id,
        status: OrderStatus.ASSIGNED,
      })

      toast.success('Zlecenie zostało dodane!')
      form.reset()
      utils.order.getOrders.invalidate()
      onCloseAction()
      onCreated?.(createdOrder.id)
    } catch {
      toast.error('Wystąpił błąd przy dodawaniu zlecenia.')
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
            <OrderFormFieldsTechnician control={form.control} />

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
