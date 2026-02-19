'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import { warehouseFormSchema } from '@/app/(modules)/opl-crm/lib/schema'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command'
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
import { devicesStatusMap } from '@/lib/constants'
import { WarehouseFormData } from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { OplDeviceCategory } from '@prisma/client'
import { ChevronsUpDown } from 'lucide-react'
import { useRef, useState } from 'react'
import Highlight from 'react-highlight-words'
import { useForm } from 'react-hook-form'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'

const defaultValues: WarehouseFormData = {
  type: 'DEVICE',
  category: 'OTHER',
  name: '',
  serialNumber: '',
}

const AddItemForm = ({
  existingItems,
  onAddItem,
}: {
  existingItems: WarehouseFormData[]
  onAddItem: (item: WarehouseFormData) => void
}) => {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [materialSearchTerm, setMaterialSearchTerm] = useState('')
  const [expandedMaterialRows, setExpandedMaterialRows] = useState<string[]>([])
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number | undefined>
  >({})

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues,
  })

  const locationId = useActiveLocation()
  const serialInputRef = useRef<HTMLInputElement>(null)

  const { data: devices = [] } =
    trpc.opl.settings.getAllOplDeviceDefinitions.useQuery()
  const { data: materials = [] } =
    trpc.opl.settings.getAllOplMaterialDefinitions.useQuery()
  const { data: allWarehouse = [] } = trpc.opl.warehouse.getAll.useQuery(
    locationId ? { locationId } : undefined,
    { enabled: !!locationId }
  )

  const filteredMaterials = materials
    .filter((m) =>
      m.name.toLowerCase().includes(materialSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' }))

  const toggleMaterialRow = (id: string) => {
    setExpandedMaterialRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
    setMaterialQuantities((prev) => ({
      ...prev,
      [id]: prev[id] ?? 1,
    }))
  }

  const handleAddMaterial = (id: string) => {
    const material = materials.find((m) => m.id === id)
    if (!material) return

    const quantityToAdd = materialQuantities[id]
    if (quantityToAdd == null || quantityToAdd <= 0 || isNaN(quantityToAdd)) {
      toast.warning('Podaj poprawną ilość.')
      return
    }

    onAddItem({
      type: 'MATERIAL',
      name: material.name,
      quantity: quantityToAdd,
    })
    toast.success('Dodano do listy.')

    setMaterialQuantities((prev) => ({ ...prev, [id]: 1 }))
    setExpandedMaterialRows((prev) => prev.filter((rowId) => rowId !== id))
  }

  const handleSubmit = (data: WarehouseFormData) => {
    if (data.type !== 'DEVICE') return
    const serial = data.serialNumber?.trim().toUpperCase()
    if (!serial) return toast.error('Wpisz numer seryjny.')

    const alreadyInList = existingItems.some(
      (i) => i.type === 'DEVICE' && i.serialNumber?.toUpperCase() === serial
    )

    const inWarehouse = allWarehouse.find(
      (i) => i.serialNumber?.toUpperCase() === serial
    )

    if (alreadyInList) {
      return toast.error('To urządzenie już znajduje się na liście.')
    }

    if (inWarehouse) {
      if (inWarehouse.status === 'RETURNED_TO_OPERATOR') {
        onAddItem(data)
        toast.success('Dodano do listy.')
        form.reset({ ...data, serialNumber: '' })
        setTimeout(() => serialInputRef.current?.focus(), 50)
        return
      }

      if (inWarehouse.status === 'AVAILABLE') {
        return toast.error('Urządzenie już znajduje się w magazynie.')
      }

      if (inWarehouse.status === 'ASSIGNED' && inWarehouse.assignedToId) {
        return toast.error(`Urządzenie jest na stanie technika.`)
      }

      return toast.error(
        `Urządzenie jest w stanie: ${devicesStatusMap[inWarehouse.status]}`
      )
    }

    onAddItem(data)
    toast.success('Dodano do listy.')
    form.reset({ ...data, serialNumber: '' })
    setTimeout(() => serialInputRef.current?.focus(), 50)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-1 gap-4"
      >
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEVICE">Urządzenie</SelectItem>
                  <SelectItem value="MATERIAL">Materiał</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('type') === 'DEVICE' && (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => {
                const filteredDevices = devices.filter((d) =>
                  d.name.toLowerCase().includes(searchTerm.toLowerCase())
                )

                return (
                  <FormItem>
                    <FormLabel>Urządzenie</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {field.value || 'Wybierz urządzenie'}
                          <ChevronsUpDown className="opacity-50 h-4 w-4 shrink-0 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={4}
                        className="p-0 w-[var(--radix-popover-trigger-width)] max-h-[320px] border bg-background overflow-hidden pointer-events-auto"
                        onWheelCapture={(e) => e.stopPropagation()}
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Szukaj urządzenie..."
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            className="h-9"
                          />
                          <CommandList
                            className="max-h-[280px] overflow-y-auto overscroll-contain scroll-smooth"
                            onWheelCapture={(e) => e.stopPropagation()} // działa także przy PWA/Modal
                            onTouchMoveCapture={(e) => e.stopPropagation()}
                          >
                            <CommandEmpty>Brak wyników.</CommandEmpty>
                            {Object.values(OplDeviceCategory).map((cat) => {
                              const defs = filteredDevices.filter(
                                (d) => d.category === cat
                              )
                              if (!defs.length) return null

                              return (
                                <CommandGroup
                                  key={cat}
                                  heading={oplDevicesTypeMap[cat]}
                                  className="capitalize"
                                >
                                  {defs.map((d) => (
                                    <CommandItem
                                      key={d.id}
                                      value={d.name}
                                      onSelect={() => {
                                        field.onChange(d.name)
                                        form.setValue('category', d.category)
                                        setOpen(false)
                                      }}
                                      className="cursor-pointer text-sm"
                                    >
                                      <Highlight
                                        searchWords={[searchTerm]}
                                        textToHighlight={d.name}
                                        highlightClassName="bg-yellow-200 dark:bg-yellow-700"
                                        autoEscape
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )
                            })}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numer seryjny</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      ref={serialInputRef}
                      placeholder="Wpisz numer seryjny"
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {form.watch('type') === 'MATERIAL' && (
          <div className="space-y-4">
            <SearchInput
              placeholder="Szukaj materiał"
              value={materialSearchTerm}
              onChange={setMaterialSearchTerm}
            />

            {filteredMaterials.map((material) => {
              const quantityInList = existingItems
                .filter(
                  (
                    item
                  ): item is Extract<WarehouseFormData, { type: 'MATERIAL' }> =>
                    item.type === 'MATERIAL' && item.name === material.name
                )
                .reduce((acc, item) => acc + (item.quantity ?? 0), 0)

              return (
                <div
                  key={material.id}
                  className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <Highlight
                      highlightClassName="bg-yellow-200 dark:bg-yellow-700"
                      searchWords={[materialSearchTerm]}
                      autoEscape
                      textToHighlight={material.name}
                    />
                    {quantityInList > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Na liście: {quantityInList}
                      </p>
                    )}
                  </div>

                  {expandedMaterialRows.includes(material.id) ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-20 text-sm"
                        value={materialQuantities[material.id] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setMaterialQuantities((prev) => ({
                            ...prev,
                            [material.id]: value === '' ? undefined : Number(value),
                          }))
                        }}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAddMaterial(material.id)}
                      >
                        Dodaj
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => toggleMaterialRow(material.id)}
                    >
                      <MdAdd />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {form.watch('type') === 'DEVICE' && (
          <div className="flex justify-end">
            <Button type="submit" variant="secondary">
              Dodaj do listy
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}

export default AddItemForm
