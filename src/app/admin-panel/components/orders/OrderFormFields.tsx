'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
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
import { Textarea } from '@/app/components/ui/textarea'
import { timeSlotOptions } from '@/lib/constants'
import { OrderFormData, TechnicianOrderFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { useEffect, useState } from 'react'
import { Control, UseFormReturn } from 'react-hook-form'

/**
 * OrderFormFields – unified form fields component for both Admin and Technician views.
 *
 * - Supports all common fields: type, operator, number, date, city, address, time slot, notes
 * - Auto-generates outage order numbers (`OUTAGE`)
 * - Shows technician select only for admin users
 * - Adjusts status automatically for admin (ASSIGNED / PENDING)
 */
type Props = {
  /** react-hook-form object (useFormReturn) */
  form:
    | UseFormReturn<OrderFormData>
    | { control: Control<TechnicianOrderFormData> }

  /** If true, enables technician assignment and status handling */
  isAdmin?: boolean
}

export const OrderFormFields = ({ form, isAdmin = false }: Props) => {
  // Cast to allow uniform access (control always exists)
  const { control, setValue, getValues, watch } =
    form as UseFormReturn<OrderFormData>

  const [operatorList, setOperatorList] = useState<string[]>([])

  const type = watch?.('type') ?? undefined

  // Fetch operator definitions
  const { data: operatorsData, isLoading: isOperatorsLoading } =
    trpc.operatorDefinition.getAllDefinitions.useQuery()

  // Fetch next outage order number (only if type === OUTAGE)
  const { data: nextOutageOrderNumber } =
    trpc.order.getNextOutageOrderNumber.useQuery(undefined, {
      enabled: type === 'OUTAGE',
    })

  // Fetch technician list (only if admin)
  const { data: technicians, isLoading: isTechLoading } = isAdmin
    ? trpc.user.getTechnicians.useQuery({ status: 'ACTIVE' })
    : { data: [], isLoading: false }

  /** Populate operator list */
  useEffect(() => {
    if (operatorsData) {
      setOperatorList(operatorsData.map((op) => op.operator))
    }
  }, [operatorsData])

  /** Auto-generate outage order number */
  useEffect(() => {
    if (type === 'OUTAGE' && nextOutageOrderNumber) {
      setValue?.('orderNumber', nextOutageOrderNumber)
    }
  }, [type, nextOutageOrderNumber, setValue])

  return (
    <>
      {/* Order type */}
      <FormField
        control={control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Typ zlecenia <span className="text-destructive">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz typ zlecenia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSTALATION">Instalacja</SelectItem>
                <SelectItem value="SERVICE">Serwis</SelectItem>
                <SelectItem value="OUTAGE">Linia</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Operator */}
      <FormField
        control={control}
        name="operator"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Operator <span className="text-destructive">*</span>
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isOperatorsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz operatora" />
              </SelectTrigger>
              <SelectContent>
                {operatorList.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Order number */}
      <FormField
        control={control}
        name="orderNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Numer zlecenia <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="np. ZL/12345"
                disabled={type === 'OUTAGE'}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Date */}
      <FormField
        control={control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Data <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Time slot */}
      <FormField
        control={control}
        name="timeSlot"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Przedział czasowy <span className="text-destructive">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz przedział czasowy" />
              </SelectTrigger>
              <SelectContent>
                {timeSlotOptions.map((slot) => (
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

      {/* City */}
      <FormField
        control={control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Miasto <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. Gdańsk" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Street */}
      <FormField
        control={control}
        name="street"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Adres (ulica, nr domu, mieszkanie){' '}
              <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. Długa 1" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Technician assignment (admin only) */}
      {isAdmin && (
        <FormField
          control={control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Przypisany technik <span className="text-destructive">*</span>
              </FormLabel>
              <Select
                onValueChange={(value) => {
                  const selected = value === 'none' ? null : value
                  field.onChange(selected)

                  // Automatically adjust status for admin
                  const currentStatus = getValues?.('status')
                  if (!currentStatus) return
                  if (selected && currentStatus === OrderStatus.PENDING) {
                    setValue?.('status', OrderStatus.ASSIGNED)
                  } else if (
                    !selected &&
                    currentStatus === OrderStatus.ASSIGNED
                  ) {
                    setValue?.('status', OrderStatus.PENDING)
                  }
                }}
                value={field.value ?? 'none'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz technika" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">NIEPRZYPISANY</SelectItem>
                  {isTechLoading ? (
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      <LoaderSpinner />
                    </div>
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
      )}

      {/* Notes (optional) */}
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Uwagi (opcjonalnie)</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Dodatkowe informacje" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
