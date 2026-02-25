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
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Control, UseFormReturn } from 'react-hook-form'
import {
  oplOrderStandardOptions,
  oplTimeSlotOptions,
} from '../../lib/constants'
import { getSuggestedOplTeamPartnerId } from '../../lib/teamSuggestions'

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

const NO_OPERATOR_VALUE = '__NO_OPERATOR__'

export const OplOrderFormFields = ({ form, isAdmin = false }: Props) => {
  // Cast to allow uniform access (control always exists)
  const { control, setValue, getValues, watch } =
    form as UseFormReturn<OplOrderFormData>

  const [operatorList, setOperatorList] = useState<string[]>([])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [equipment, setEquipment] = useState<EquipmentRequirementVM[]>([])
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const orderNumberInputRef = useRef<HTMLInputElement | null>(null)
  const [cityFocused, setCityFocused] = useState(false)
  const [streetFocused, setStreetFocused] = useState(false)

  const assignedTechnicianIds = watch('assignedTechnicianIds')
  const type = watch?.('type') ?? undefined
  const cityValue = String(watch?.('city') ?? '')
  const streetValue = String(watch?.('street') ?? '')
  const currentYear = new Date().getFullYear()
  const gftOrderPrefixes = ['GFT013', 'GFT010', 'GFT007']
  const deferredCityValue = useDeferredValue(cityValue)
  const deferredStreetValue = useDeferredValue(streetValue)
  const focusOrderNumberAtEditablePart = (value: string) => {
    requestAnimationFrame(() => {
      const input = orderNumberInputRef.current
      if (!input) return
      input.focus()
      const sfToken = '/I/SF-'
      const kzToken = '/KZ/'
      const sfIdx = value.indexOf(sfToken)
      const kzIdx = value.indexOf(kzToken)

      let pos = value.length
      if (sfIdx >= 0) pos = sfIdx + sfToken.length
      if (kzIdx >= 0) pos = kzIdx + kzToken.length

      input.setSelectionRange(pos, pos)
    })
  }

  const insertGftTemplate = (prefix: string) => {
    const currentValue = String(getValues?.('orderNumber') ?? '').trim()
    const matchGft = currentValue.match(
      /^([^/]+)\/I\/SF-([^/]+)\/(\d{4})\/(\d+)$/
    )
    const matchKz = currentValue.match(/^I_GNG\/KZ\/([^/]+)\/(\d{4})\/(\d+)$/)

    const sfPart = matchGft?.[2] ?? matchKz?.[1] ?? ''
    const yearPart = matchGft?.[3] ?? matchKz?.[2] ?? String(currentYear)
    const entryPart = matchGft?.[4] ?? matchKz?.[3] ?? '1'

    const next = `${prefix}/I/SF-${sfPart}/${yearPart}/${entryPart}`
    setValue('orderNumber', next, {
      shouldDirty: true,
      shouldValidate: true,
    })
    focusOrderNumberAtEditablePart(next)
  }

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
  const { data: oplTeams } = isAdmin
    ? trpc.opl.user.getTeams.useQuery({ activeOnly: true })
    : { data: [] }

  const citySuggestionsQuery = trpc.opl.order.getAddressSuggestions.useQuery(
    { query: deferredCityValue.trim(), limit: 8 },
    {
      enabled: cityFocused && deferredCityValue.trim().length >= 2,
      staleTime: 1000 * 60 * 5,
    }
  )

  const streetSuggestionsQuery = trpc.opl.order.getAddressSuggestions.useQuery(
    {
      query: deferredStreetValue.trim(),
      cityHint: deferredCityValue.trim() || undefined,
      limit: 8,
    },
    {
      enabled: streetFocused && deferredStreetValue.trim().length >= 2,
      staleTime: 1000 * 60 * 5,
    }
  )

  const suggestedSecondTechnicianId = useMemo(
    () =>
      getSuggestedOplTeamPartnerId(
        (oplTeams as Array<{
          technician1Id: string
          technician2Id: string
          active?: boolean
        }> | undefined) ?? [],
        assignedTechnicianIds?.[0]
      ),
    [oplTeams, assignedTechnicianIds]
  )

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
              <SelectContent className="bg-background">
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
              Operator
            </FormLabel>
            <Select
              onValueChange={(value) =>
                field.onChange(
                  value === NO_OPERATOR_VALUE ? undefined : value
                )
              }
              value={field.value ?? NO_OPERATOR_VALUE}
              disabled={isOperatorsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz operatora" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value={NO_OPERATOR_VALUE}>Brak</SelectItem>
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

              <SelectContent className="bg-background">
                <SelectItem value="ORANGE">Orange</SelectItem>
                <SelectItem value="SI">SI</SelectItem>
                <SelectItem value="PSO">PŚO</SelectItem>
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
                ref={(el) => {
                  field.ref(el)
                  orderNumberInputRef.current = el
                }}
                placeholder={`np. GFT013/I/SF-4615223/${currentYear}/1`}
                disabled={type === 'OUTAGE'}
              />
            </FormControl>
            {type !== 'OUTAGE' && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {gftOrderPrefixes.map((prefix) => (
                    <Button
                      key={prefix}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-mono"
                      onClick={() => insertGftTemplate(prefix)}
                    >
                      {prefix}/I/SF-.../{currentYear}/...
                    </Button>
                  ))}
                </div>

              </div>
            )}
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

      {/* Order standard (not required for SERVICE) */}
      {type !== 'SERVICE' && (
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

                <SelectContent className="bg-background">
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
      )}

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
              <SelectContent className="bg-background">
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
          <FormItem className="relative">
            <FormLabel>
              Miasto <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="np. Gdańsk"
                autoComplete="off"
                onFocus={() => setCityFocused(true)}
                onBlur={() => setTimeout(() => setCityFocused(false), 120)}
              />
            </FormControl>
            {cityFocused &&
              deferredCityValue.trim().length >= 2 &&
              citySuggestionsQuery.data &&
              citySuggestionsQuery.data.length > 0 && (
                <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-background shadow-md">
                  <div className="max-h-56 overflow-auto p-1">
                    {Array.from(
                      new Map(
                        citySuggestionsQuery.data
                          .map((s) => s.city.trim())
                          .filter(Boolean)
                          .map((city) => [city.toLowerCase(), city])
                      ).values()
                    )
                      .slice(0, 8)
                      .map((city) => (
                        <button
                          key={city}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setValue('city', city, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            setCityFocused(false)
                          }}
                        >
                          {city}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Street */}
      <FormField
        control={control}
        name="street"
        render={({ field }) => (
          <FormItem className="relative">
            <FormLabel>
              Adres (ulica, nr domu, mieszkanie){' '}
              <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="np. Długa 1"
                autoComplete="off"
                onFocus={() => setStreetFocused(true)}
                onBlur={() => setTimeout(() => setStreetFocused(false), 120)}
              />
            </FormControl>
            {streetFocused &&
              deferredStreetValue.trim().length >= 2 &&
              streetSuggestionsQuery.data &&
              streetSuggestionsQuery.data.length > 0 && (
                <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-background shadow-md">
                  <div className="max-h-64 overflow-auto p-1">
                    {streetSuggestionsQuery.data.map((suggestion) => (
                      <button
                        key={`${suggestion.source}-${suggestion.city}-${suggestion.street}`}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (suggestion.city) {
                            setValue('city', suggestion.city, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          if (suggestion.street) {
                            setValue('street', suggestion.street, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          setStreetFocused(false)
                        }}
                      >
                        <div className="text-sm">
                          {[suggestion.city, suggestion.street]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                    const hasSecondTechnician = assignedTechnicianIds.length > 1
                    const currentSecond = assignedTechnicianIds[1]
                    const suggestedSecond = getSuggestedOplTeamPartnerId(
                      (oplTeams as Array<{
                        technician1Id: string
                        technician2Id: string
                        active?: boolean
                      }> | undefined) ?? [],
                      value
                    )

                    setValue(
                      'assignedTechnicianIds',
                      hasSecondTechnician
                        ? [value, currentSecond || suggestedSecond || '']
                        : [value],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      }
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz technika" />
                  </SelectTrigger>

                  <SelectContent className="bg-background">
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
                            [
                              assignedTechnicianIds[0],
                              suggestedSecondTechnicianId ?? '',
                            ],
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

                    <SelectContent className="bg-background">
                      {technicians
                        ?.filter((t) => t.id !== assignedTechnicianIds[0])
                        .map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {!field.value && suggestedSecondTechnicianId ? (
                    <p className="text-xs text-muted-foreground">
                      Podpowiedź drugiego technika uzupełniana jest automatycznie na podstawie ekipy.
                    </p>
                  ) : null}

                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}

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

          <PopoverContent className="w-full p-0 bg-background">
            <Command className="bg-background">
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
