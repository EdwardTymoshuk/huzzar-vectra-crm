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
import { Standard, TimeSlot } from '@prisma/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

/**
 * Schema validation for adding new orders
 */
const orderSchema = z.object({
  orderNumber: z.string().min(3, 'Numer zlecenia jest wymagany'),
  date: z.string().min(1, 'Data jest wymagana'),
  timeSlot: z.nativeEnum(TimeSlot),
  standard: z.nativeEnum(Standard),
  contractRequired: z.boolean(),
  county: z.string().min(2, 'Powiat jest wymagany'),
  municipality: z.string().min(2, 'Gmina jest wymagana'),
  city: z.string().min(2, 'Miasto jest wymagane'),
  street: z.string().min(3, 'Ulica jest wymagana'),
  postalCode: z.string().min(5, 'Kod pocztowy jest wymagany'),
  technician: z.string().optional(),
})

type OrderFormData = z.infer<typeof orderSchema>

/**
 * AddOrderModal component:
 * - Displays a form for adding new orders
 * - Uses validation and API integration
 */
const AddOrderModal = ({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()

  // tRPC mutation for creating an order
  const createOrderMutation = trpc.order.createOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało dodane!')
      utils.order.getOrders.invalidate() // Refresh order list
      onClose()
    },
    onError: () => toast.error('Błąd podczas dodawania zlecenia.'),
  })

  // React Hook Form setup
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  })

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true)
    await createOrderMutation.mutateAsync(data)
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nowe zlecenie</DialogTitle>
        </DialogHeader>

        {/* Order Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numer zlecenia</FormLabel>
                  <FormControl>
                    <Input placeholder="Wpisz numer zlecenia" {...field} />
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
                  <FormLabel>Przedział czasowy</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz przedział czasowy" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TimeSlot).map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="standard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Standard</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz standard" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Standard).map((std) => (
                        <SelectItem key={std} value={std}>
                          {std}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wymaga umowy?</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'true')}
                    defaultValue={String(field.value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tak/Nie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Tak</SelectItem>
                      <SelectItem value="false">Nie</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Powiat</FormLabel>
                  <FormControl>
                    <Input placeholder="Podaj powiat" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gmina</FormLabel>
                  <FormControl>
                    <Input placeholder="Podaj gminę" {...field} />
                  </FormControl>
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
                    <Input placeholder="Podaj miasto" {...field} />
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
                    <Input placeholder="Podaj ulicę" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod pocztowy</FormLabel>
                  <FormControl>
                    <Input placeholder="00-000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
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
