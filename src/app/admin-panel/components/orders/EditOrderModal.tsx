'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { Prisma } from '@prisma/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

/**
 * Schema validation for editing orders
 */
const orderSchema = z.object({
  orderNumber: z.string().min(3, 'Numer zlecenia jest wymagany'),
  date: z.string().min(1, 'Data jest wymagana'),
  timeSlot: z.enum([
    'EIGHT_ELEVEN',
    'ELEVEN_FOURTEEN',
    'FOURTEEN_SEVENTEEN',
    'SEVENTEEN_TWENTY',
  ]),
  standard: z.enum(['W1', 'W2', 'W3', 'W4', 'W5', 'W6']),
  contractRequired: z.boolean(),
  equipmentNeeded: z.string(),
  clientPhoneNumber: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum([
    'PENDING',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'NOT_COMPLETED',
    'CANCELED',
  ]),
  county: z.string(),
  municipality: z.string(),
  city: z.string(),
  street: z.string(),
  postalCode: z.string(),
  assignedToId: z.string().optional(),
})

type OrderFormData = z.infer<typeof orderSchema>
type OrderWithAssignedTo = Prisma.OrderGetPayload<{
  include: { assignedTo: { select: { id: true; name: true } } }
}>

const EditOrderModal = ({
  order,
  onClose,
}: {
  order: OrderWithAssignedTo
  onClose: () => void
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()

  // Fetch technicians for assignment
  const { data: technicians } = trpc.user.getAllUsers.useQuery()

  // tRPC mutation for updating an order
  const updateOrderMutation = trpc.order.editOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało zaktualizowane!')
      utils.order.getOrders.invalidate()
      onClose()
    },
    onError: () => toast.error('Błąd podczas aktualizacji zlecenia.'),
  })

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      orderNumber: order.orderNumber,
      date: new Date(order.date).toISOString().split('T')[0],
      timeSlot: order.timeSlot,
      standard: order.standard,
      contractRequired: order.contractRequired,
      equipmentNeeded: order.equipmentNeeded.join(', '),
      clientPhoneNumber: order.clientPhoneNumber || '',
      notes: order.notes || '',
      status: order.status,
      county: order.county,
      municipality: order.municipality,
      city: order.city,
      street: order.street,
      postalCode: order.postalCode,
      assignedToId: order.assignedToId || '',
    },
  })

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true)

    const updatedStatus =
      data.assignedToId && data.assignedToId !== 'none'
        ? 'ASSIGNED'
        : data.status === 'ASSIGNED'
        ? 'PENDING'
        : data.status

    await updateOrderMutation.mutateAsync({
      ...data,
      id: order.id,
      status: updatedStatus,
      assignedToId:
        data.assignedToId === 'none' ? undefined : data.assignedToId,
      equipmentNeeded: data.equipmentNeeded
        .split(',')
        .map((item) => item.trim()),
    })

    setIsSubmitting(false)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj zlecenie</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numer zlecenia</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeSlot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slot czasowy</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EIGHT_ELEVEN">8:00 - 11:00</SelectItem>
                      <SelectItem value="ELEVEN_FOURTEEN">
                        11:00 - 14:00
                      </SelectItem>
                      <SelectItem value="FOURTEEN_SEVENTEEN">
                        14:00 - 17:00
                      </SelectItem>
                      <SelectItem value="SEVENTEEN_TWENTY">
                        17:00 - 20:00
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miasto</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ulica</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Przypisany technik</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz technika" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nieprzypisany</SelectItem>
                      {technicians?.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
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
