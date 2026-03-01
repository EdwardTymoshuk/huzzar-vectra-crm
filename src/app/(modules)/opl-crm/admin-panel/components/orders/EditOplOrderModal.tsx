'use client'

import { orderSchema } from '@/app/(modules)/opl-crm/lib/schema'
import LoaderSpinner from '@/app/components/LoaderSpinner'
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
import { OplOrderStatus } from '@prisma/client'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { OplOrderFormFields } from '../../../components/order/OplOrderFormFields'

type Props = {
  open: boolean
  orderId: string
  onCloseAction: () => void
}

const normalizeAssignedTechnicians = (ids: string[]): string[] =>
  Array.from(new Set(ids)).slice(0, 2)

const EditOplOrderModal = ({ open, orderId, onCloseAction }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()

  const { data: order, isLoading } = trpc.opl.order.getOrderById.useQuery(
    { id: orderId },
    { enabled: open }
  )

  const updateOrderMutation = trpc.opl.order.editOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zapisane')
      utils.opl.order.invalidate()
      onCloseAction()
    },
  })

  const defaultAssignedIds = useMemo(
    () =>
      order
        ? normalizeAssignedTechnicians(
            order.assignments.map((a) => a.technicianId)
          )
        : [],
    [order]
  )

  const form = useForm<OplOrderFormData>({
    resolver: zodResolver(orderSchema),
    values: order
      ? {
          type: order.type,
          operator: order.operator === 'OA' ? 'OA' : 'ORANGE',

          network: order.network ?? 'ORANGE',

          orderNumber: order.orderNumber,
          date: format(new Date(order.date), 'yyyy-MM-dd'),
          timeSlot: order.timeSlot,

          city: order.city,
          street: order.street,
          postalCode: order.postalCode ?? '',

          clientPhoneNumber: order.clientPhoneNumber ?? undefined,

          assignedTechnicianIds: defaultAssignedIds,

          standard: order.standard ?? undefined,
          termChangeFlag: order.termChangeFlag === 'T' ? 'T' : 'N',
          leads: order.leads ?? 0,

          notes: order.notes ?? undefined,

          contractRequired: order.contractRequired ?? false,

          equipmentRequirements:
            order.equipmentRequirements?.map((e) => ({
              deviceDefinitionId: e.deviceDefinitionId,
              quantity: e.quantity,
            })) ?? undefined,

          status: order.status ?? OplOrderStatus.PENDING,
        }
      : undefined,
  })

  if (isLoading || !order) {
    return (
      <Dialog open={open} onOpenChange={onCloseAction}>
        <DialogContent>
          <LoaderSpinner />
        </DialogContent>
      </Dialog>
    )
  }

  const onSubmit = async (data: OplOrderFormData) => {
    setIsSubmitting(true)
    try {
      await updateOrderMutation.mutateAsync({
        id: orderId,
        ...data,
        assignedTechnicianIds: normalizeAssignedTechnicians(
          data.assignedTechnicianIds
        ),
      })
    } catch {
      toast.error('Błąd zapisu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj zlecenie</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <OplOrderFormFields form={form} isAdmin />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCloseAction}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Zapisz
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditOplOrderModal
