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
import { timeSlotOptions } from '@/lib/constants'
import { OrderFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'

/**
 * Admin-facing order form fields
 * Includes all necessary data required to define a full order
 */
export function OrderFormFields({
  form,
}: {
  form: UseFormReturn<OrderFormData>
}) {
  const [operatorList, setOperatorList] = useState<string[]>([])
  const { control } = form

  // Fetch operator list from database
  const { data: operatorsData, isLoading: isOperatorsLoading } =
    trpc.operatorDefinition.getAllDefinitions.useQuery()

  useEffect(() => {
    if (operatorsData) {
      setOperatorList(operatorsData.map((op) => op.operator))
    }
  }, [operatorsData])

  // Fetch technician list
  const { data: technicians, isLoading: isTechLoading } =
    trpc.user.getTechnicians.useQuery({
      status: 'ACTIVE',
    }) || { data: [] }

  return (
    <>
      {/* Order type (INSTALLATION or SERVICE) */}
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
                <SelectItem value="OUTAGE">Linia</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Operator (dynamic, from DB) */}
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
              <Input {...field} placeholder="np. ZL/12345" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Order date */}
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

      {/* Time slot (static options) */}
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

      {/* Assigned technician (optional) */}
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

                // Automatically adjust status based on assignment
                const currentStatus = form.getValues('status')
                if (selected && currentStatus === OrderStatus.PENDING) {
                  form.setValue('status', OrderStatus.ASSIGNED)
                } else if (
                  !selected &&
                  currentStatus === OrderStatus.ASSIGNED
                ) {
                  form.setValue('status', OrderStatus.PENDING)
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
      {/* Notes (optional) */}
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Uwagi (opcjonalnie)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. dzwonić przed wizytą" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
