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
import { OrderFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { useEffect, useState } from 'react'
import { Control } from 'react-hook-form'

export function OrderFormFields({
  control,
}: {
  control: Control<OrderFormData>
}) {
  const [operatorList, setOperatorList] = useState<string[]>([])

  // Fetch dynamic operators
  const { data: operatorsData, isLoading: isOperatorsLoading } =
    trpc.operatorDefinition.getAllDefinitions.useQuery()

  useEffect(() => {
    if (operatorsData) {
      setOperatorList(operatorsData.map((op) => op.operator))
    }
  }, [operatorsData])

  // Fetch technicians
  const { data: technicians, isLoading: isTechLoading } =
    trpc.user.getTechnicians?.useQuery() || { data: [] }

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

      {/* OPERATOR (z bazy danych) */}
      <FormField
        control={control}
        name="operator"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Operator <span className="text-danger">*</span>
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

      {/* NUMER ZLECENIA */}
      <FormField
        control={control}
        name="orderNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Numer zlecenia *</FormLabel>
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
            <FormLabel>Data *</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* PRZEDZIAŁ CZASOWY – WSZYSTKIE SLOTY */}
      <FormField
        control={control}
        name="timeSlot"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Przedział czasowy *</FormLabel>
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

      {/* WYMAGA UMOWY */}
      <FormField
        control={control}
        name="contractRequired"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Wymaga umowy? *</FormLabel>
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
            <FormLabel>Miasto *</FormLabel>
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
            <FormLabel>Ulica *</FormLabel>
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
            <FormLabel>Kod pocztowy *</FormLabel>
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
                {isTechLoading ? (
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
