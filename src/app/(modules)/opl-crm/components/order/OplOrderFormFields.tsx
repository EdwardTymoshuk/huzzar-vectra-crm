'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import { Calendar } from '@/app/components/ui/calendar'
import { Command, CommandGroup, CommandItem } from '@/app/components/ui/command'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form'
import { Input } from '@/app/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Textarea } from '@/app/components/ui/textarea'
import { OplOrderFormData, TechnicianOplOrderFormData } from '@/types/opl-crm'
import { toLocalDateOnly } from '@/utils/dates/formatDateTime'
import { trpc } from '@/utils/trpc'
import { OplOrderStandard, OplOrderStatus } from '@prisma/client'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Control, UseFormReturn } from 'react-hook-form'
import {
  oplOrderStandardOptions,
  oplTimeSlotOptions,
} from '../../lib/constants'

/**
 * OplOrderFormFields – unified form fields component for both Admin and Technician views.
 *
 * - Supports all common fields: type, operator, number, date, city, address, time slot, notes
 * - Auto-generates outage order numbers (`OUTAGE`)
 * - Shows technician select only for admin users
 * - Adjusts status automatically for admin (ASSIGNED / PENDING)
 */
type Props = {
  /** react-hook-form object (useFormReturn) */
  form:
    | UseFormReturn<OplOrderFormData>
    | { control: Control<TechnicianOplOrderFormData> }

  /** If true, enables technician assignment and status handling */
  isAdmin?: boolean
}

type EquipmentRequirementVM = {
  deviceDefinitionId: string
  name: string
  quantity: number
}

export const OplOrderFormFields = ({ form, isAdmin = false }: Props) => {
  // Cast to allow uniform access (control always exists)
  const { control, setValue, getValues, watch } =
    form as UseFormReturn<OplOrderFormData>

  const [operatorList, setOperatorList] = useState<string[]>([])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [equipment, setEquipment] = useState<EquipmentRequirementVM[]>([])
  const [equipmentOpen, setEquipmentOpen] = useState(false)

  const assignedTechnicianIds = watch('assignedTechnicianIds')
  const type = watch?.('type') ?? undefined

  // Fetch device definitions
  const { data: deviceDefinitions, isLoading: isDevicesLoading } =
    trpc.opl.settings.getAllOplDeviceDefinitions.useQuery()

  // Fetch operator definitions
  const { data: operatorsData, isLoading: isOperatorsLoading } =
    trpc.opl.settings.getAllOplOperatorDefinitions.useQuery()

  // Fetch next outage order number (only if type === OUTAGE)
  const { data: nextOutageOrderNumber } =
    trpc.opl.order.getNextOutageOrderNumber.useQuery(undefined, {
      enabled: type === 'OUTAGE',
    })

  // Fetch technician list (only if admin)
  const { data: technicians, isLoading: isTechLoading } = isAdmin
    ? trpc.opl.user.getTechnicians.useQuery({ status: 'ACTIVE' })
    : { data: [], isLoading: false }

  useEffect(() => {
    if (!isAdmin) return

    if (!assignedTechnicianIds || assignedTechnicianIds.length === 0) {
      setValue('status', OplOrderStatus.PENDING, {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }

    setValue('status', OplOrderStatus.ASSIGNED, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [assignedTechnicianIds, isAdmin, setValue])

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

  useEffect(() => {
    setValue(
      'equipmentRequirements',
      equipment.map((e) => ({
        deviceDefinitionId: e.deviceDefinitionId,
        quantity: e.quantity,
      })),
      { shouldDirty: true }
    )
  }, [equipment, setValue])

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
                <SelectItem value="INSTALLATION">Instalacja</SelectItem>
                <SelectItem value="SERVICE">Serwis</SelectItem>
                <SelectItem value="OUTAGE">Awaria</SelectItem>
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

      {/* Network operator (ORANGE / SI) */}
      <FormField
        control={control}
        name="network"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Operator sieci <span className="text-destructive">*</span>
            </FormLabel>

            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz operatora sieci" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ORANGE">Orange</SelectItem>
                <SelectItem value="SI">SI</SelectItem>
              </SelectContent>
            </Select>

            <FormMessage />
          </FormItem>
        )}
      />

      {/* Client ID */}
      <FormField
        control={control}
        name="serviceId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              ID usługi <span className="text-destructive"></span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="np. 34323456957534"
                className="font-mono"
                onChange={(e) => {
                  const cleaned = e.target.value.trim()
                  field.onChange(cleaned)
                }}
              />
            </FormControl>
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
                placeholder="np. Q_GGS/Z/12345/2026/1"
                disabled={type === 'OUTAGE'}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Client number */}
      <FormField
        control={control}
        name="clientPhoneNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Numer kontaktowy klienta</FormLabel>
            <FormControl>
              <Input {...field} placeholder="np. 600123456" inputMode="tel" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Order standard */}
      <FormField
        control={control}
        name="standard"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Standard zlecenia<span className="text-destructive">*</span>
            </FormLabel>

            <Select
              value={field.value ?? undefined}
              onValueChange={(value) =>
                field.onChange(value as OplOrderStandard)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz standard" />
              </SelectTrigger>

              <SelectContent>
                {oplOrderStandardOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {field.value
                    ? format(new Date(field.value), 'dd/MM/yyyy', {
                        locale: pl,
                      })
                    : 'Wybierz datę'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => {
                    if (date) field.onChange(toLocalDateOnly(date))
                    setIsCalendarOpen(false)
                  }}
                  locale={pl}
                />
              </PopoverContent>
            </Popover>
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
                {oplTimeSlotOptions.map((slot) => (
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

      {/* Technicians assignment (admin only) */}
      {isAdmin && (
        <div className="space-y-4">
          <FormField
            control={control}
            name="assignedTechnicianIds.0"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Technik <span className="text-destructive">*</span>
                </FormLabel>

                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    setValue('assignedTechnicianIds', [value], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz technika" />
                  </SelectTrigger>

                  <SelectContent>
                    {isTechLoading ? (
                      <div className="px-4 py-2">
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

          <FormField
            control={control}
            name="assignedTechnicianIds"
            render={() => {
              const hasSecondTechnician = assignedTechnicianIds.length > 1

              return (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={hasSecondTechnician}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setValue(
                            'assignedTechnicianIds',
                            [assignedTechnicianIds[0], ''],
                            { shouldDirty: true, shouldValidate: true }
                          )
                        } else {
                          setValue(
                            'assignedTechnicianIds',
                            [assignedTechnicianIds[0]],
                            { shouldDirty: true, shouldValidate: true }
                          )
                        }
                      }}
                      className="h-5 w-5 accent-primary cursor-pointer"
                    />

                    <FormLabel className="!mt-0 cursor-pointer select-none">
                      Dodaj drugiego technika
                    </FormLabel>
                  </div>

                  <FormMessage />
                </FormItem>
              )
            }}
          />

          {assignedTechnicianIds.length > 1 && (
            <FormField
              control={control}
              name="assignedTechnicianIds.1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Drugi technik<span className="text-destructive">*</span>
                  </FormLabel>

                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz drugiego technika" />
                    </SelectTrigger>

                    <SelectContent>
                      {technicians
                        ?.filter((t) => t.id !== assignedTechnicianIds[0])
                        .map((tech) => (
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
          )}
        </div>
      )}

      <FormField
        control={control}
        name="contractRequired"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-5 w-5 accent-primary cursor-pointer"
              />
              <FormLabel className="!mt-0 cursor-pointer">
                Wymagana umowa
              </FormLabel>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormItem>
        <FormLabel>Sprzęt do wydania</FormLabel>

        <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
            >
              Dodaj sprzęt
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-full p-0">
            <Command>
              <CommandGroup>
                {deviceDefinitions?.map((d) => (
                  <CommandItem
                    key={d.id}
                    onSelect={() => {
                      setEquipment((prev) => {
                        const existing = prev.find(
                          (e) => e.deviceDefinitionId === d.id
                        )

                        if (existing) {
                          return prev.map((e) =>
                            e.deviceDefinitionId === d.id
                              ? { ...e, quantity: e.quantity + 1 }
                              : e
                          )
                        }

                        return [
                          ...prev,
                          {
                            deviceDefinitionId: d.id,
                            name: d.name,
                            quantity: 1,
                          },
                        ]
                      })
                      setEquipmentOpen(false)
                    }}
                  >
                    {d.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </FormItem>

      {equipment.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          {equipment.map((item) => (
            <div
              key={item.deviceDefinitionId}
              className="flex items-center justify-between text-sm"
            >
              <span>
                {item.name}
                <span className="ml-2 text-muted-foreground">
                  x{item.quantity}
                </span>
              </span>

              <div className="flex gap-1">
                {/* MINUS or TRASH */}
                {item.quantity === 1 ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setEquipment((prev) =>
                          prev.filter(
                            (e) =>
                              e.deviceDefinitionId !== item.deviceDefinitionId
                          )
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* PLUS */}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setEquipment((prev) =>
                          prev.map((e) =>
                            e.deviceDefinitionId === item.deviceDefinitionId
                              ? { ...e, quantity: e.quantity + 1 }
                              : e
                          )
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setEquipment((prev) =>
                          prev.map((e) =>
                            e.deviceDefinitionId === item.deviceDefinitionId
                              ? { ...e, quantity: e.quantity - 1 }
                              : e
                          )
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    {/* PLUS */}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setEquipment((prev) =>
                          prev.map((e) =>
                            e.deviceDefinitionId === item.deviceDefinitionId
                              ? { ...e, quantity: e.quantity + 1 }
                              : e
                          )
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
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
