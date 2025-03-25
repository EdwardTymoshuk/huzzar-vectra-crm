'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import {
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
import { timeSlotOptions } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { Operator, OrderStatus, OrderType, TimeSlot } from '@prisma/client'
import { useEffect, useState } from 'react'
import { Control, useWatch } from 'react-hook-form'
import { z } from 'zod'

/**
 * Zod schema for the order form.
 * We do NOT use .transform() on equipmentNeeded here,
 * so it remains a string (or undefined) in the form.
 */
export const orderSchema = z.object({
  type: z.nativeEnum(OrderType, {
    required_error: 'Typ zlecenia jest wymagany',
  }),
  operator: z.nativeEnum(Operator, {
    required_error: 'Operator jest wymagany',
  }),
  orderNumber: z
    .string({
      required_error: 'Numer zlecenia jest wymagany',
    })
    .min(3, 'Numer zlecenia musi mieć co najmniej 3 znaki'),
  date: z
    .string({
      required_error: 'Data jest wymagana',
    })
    .min(1, 'Data nie może być pusta'),
  timeSlot: z.nativeEnum(TimeSlot, {
    required_error: 'Przedział czasowy jest wymagany',
  }),
  contractRequired: z.boolean({
    required_error: 'Pole wymagane (Tak/Nie)',
  }),
  city: z
    .string({
      required_error: 'Miasto jest wymagane',
    })
    .min(2, 'Miasto musi mieć co najmniej 2 znaki'),
  street: z
    .string({
      required_error: 'Ulica jest wymagana',
    })
    .min(3, 'Ulica musi mieć co najmniej 3 znaki'),
  postalCode: z
    .string({
      required_error: 'Kod pocztowy jest wymagany',
    })
    .min(5, 'Kod pocztowy musi mieć co najmniej 5 znaków'),

  // Optional
  county: z.string().optional(),
  municipality: z.string().optional(),
  assignedToId: z.string().optional(),
  clientPhoneNumber: z.string().optional(),
  notes: z.string().optional(),

  /**
   * equipmentNeeded is a simple string in the form,
   * e.g. "router, kabel". We turn it into an array in onSubmit.
   */
  equipmentNeeded: z.string().optional(),

  status: z.nativeEnum(OrderStatus),
})

/**
 * Type for the form data. Notice that `equipmentNeeded` is now `string | undefined`.
 */
export type OrderFormData = z.infer<typeof orderSchema>

/**
 * A reusable component for rendering all the fields for an "order" form.
 * Comments in English, UI in Polish.
 */
export function OrderFormFields({
  control,
}: {
  control: Control<OrderFormData>
}) {
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(
    null
  )

  // Watch the operator value to filter time slots
  const operatorValue = useWatch({ control, name: 'operator' })

  // For listing all technicians. If you have a user.getTechnicians or similar:
  const { data: technicians, isLoading } =
    trpc.user.getTechnicians?.useQuery() || {
      data: [],
    }

  useEffect(() => {
    if (operatorValue && operatorValue !== selectedOperator) {
      setSelectedOperator(operatorValue)
    }
  }, [operatorValue, selectedOperator])

  const availableSlots = selectedOperator
    ? timeSlotOptions[selectedOperator]
    : []

  return (
    <>
      {/* TYP ZLECENIA */}
      <FormField
        control={control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Typ zlecenia <span className="text-danger">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz typ zlecenia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSTALATION">Instalacja</SelectItem>
                <SelectItem value="SERVICE">Serwis</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* OPERATOR */}
      <FormField
        control={control}
        name="operator"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Operator <span className="text-danger">*</span>
            </FormLabel>
            <Select
              onValueChange={(val) => field.onChange(val as Operator)}
              value={field.value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz operatora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="V">V</SelectItem>
                <SelectItem value="MMP">MMP</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* NUMER ZLECENIA */}
      <FormField
        control={control}
        name="orderNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Numer zlecenia <span className="text-danger">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. 12345" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* DATA */}
      <FormField
        control={control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Data <span className="text-danger">*</span>
            </FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* PRZEDZIAŁ CZASOWY */}
      <FormField
        control={control}
        name="timeSlot"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Przedział czasowy <span className="text-danger">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz przedział czasowy" />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* WYMAGA UMOWY */}
      <FormField
        control={control}
        name="contractRequired"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Wymaga umowy? <span className="text-danger">*</span>
            </FormLabel>
            <Select
              onValueChange={(val) => field.onChange(val === 'true')}
              value={String(field.value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tak / Nie" />
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

      {/* MIASTO */}
      <FormField
        control={control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Miasto <span className="text-danger">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. Gdańsk" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ULICA */}
      <FormField
        control={control}
        name="street"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Ulica <span className="text-danger">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. Długa 1" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* KOD POCZTOWY */}
      <FormField
        control={control}
        name="postalCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Kod pocztowy <span className="text-danger">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="00-000" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* POWIAT (opcjonalny) */}
      <FormField
        control={control}
        name="county"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Powiat (opcjonalnie)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. Gdańsk" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* GMINA (opcjonalna) */}
      <FormField
        control={control}
        name="municipality"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gmina (opcjonalnie)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. Gdańsk" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* NR TELEFONU KLIENTA (opcjonalny) */}
      <FormField
        control={control}
        name="clientPhoneNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefon klienta (opcjonalnie)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. 500600700" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* UWAGI (opcjonalne) */}
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Uwagi (opcjonalne)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. dzwonić przed wizytą" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* WYMAGANY SPRZĘT (opcjonalny) */}
      <FormField
        control={control}
        name="equipmentNeeded"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dostarczany sprzęt (opcjonalnie)</FormLabel>
            <FormControl>
              <Input
                value={field.value || ''} // It's a string in the form
                onChange={(e) => field.onChange(e.target.value)}
                placeholder="np. router, dekoder"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* STATUS (opcjonalny) */}
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status (opcjonalny)</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? 'PENDING'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">NIE PRZYPISANE</SelectItem>
                <SelectItem value="ASSIGNED">PRZYPISANE</SelectItem>
                <SelectItem value="IN_PROGRESS">W TRAKCIE</SelectItem>
                <SelectItem value="COMPLETED">WYKONANE</SelectItem>
                <SelectItem value="NOT_COMPLETED">NIEWYKONANE</SelectItem>
                <SelectItem value="CANCELED">WYCOFANE</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* PRZYPISANY TECHNIK (opcjonalny) */}
      <FormField
        control={control}
        name="assignedToId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Przypisany technik (opcjonalnie)</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value === 'none' ? null : value)
                if (
                  value !== 'none' &&
                  control._formValues.status === OrderStatus.PENDING
                ) {
                  control._formValues.status = OrderStatus.ASSIGNED
                }
                if (
                  value === 'none' &&
                  control._formValues.status === OrderStatus.ASSIGNED
                ) {
                  control._formValues.status = OrderStatus.PENDING
                }
              }}
              value={field.value ?? 'none'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz technika" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nieprzypisany</SelectItem>
                {isLoading ? (
                  <SelectItem disabled value="">
                    <LoaderSpinner />
                  </SelectItem>
                ) : (
                  technicians?.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
