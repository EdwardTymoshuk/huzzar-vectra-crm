'use client'

import { Button } from '@/app/components/ui/button'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { devicesStatusMap, devicesTypeMap } from '@/lib/constants'
import { itemSchema } from '@/lib/schema'
import { DeviceFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { DeviceCategory } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const defaultValues: DeviceFormData = {
  type: 'DEVICE',
  category: undefined,
  name: '',
  serialNumber: '',
  quantity: 1,
}

const AddItemForm = ({
  existingItems,
  onAddItem,
}: {
  existingItems: DeviceFormData[]
  onAddItem: (item: DeviceFormData) => void
}) => {
  const form = useForm<DeviceFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues,
  })

  const { data: devices = [] } =
    trpc.deviceDefinition.getAllDefinitions.useQuery()
  const { data: materials = [] } = trpc.materialDefinition.getAll.useQuery()
  const { data: allWarehouse = [] } = trpc.warehouse.getAll.useQuery()

  const handleSubmit = (data: DeviceFormData) => {
    if (data.type === 'DEVICE') {
      const serial = data.serialNumber?.trim().toUpperCase()
      if (!serial) return toast.error('Wpisz numer seryjny.')

      const alreadyInList = existingItems.some(
        (i) => i.serialNumber?.toUpperCase() === serial
      )

      const inWarehouse = allWarehouse.find(
        (i) => i.serialNumber?.toUpperCase() === serial
      )

      if (alreadyInList) {
        return toast.error('To urządzenie już znajduje się na liście.')
      }

      if (inWarehouse) {
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
    }

    onAddItem(data)
    toast.success('Dodano do listy.')

    if (data.type === 'DEVICE') {
      form.reset({ ...data, serialNumber: '' })
    } else {
      form.reset({ type: 'MATERIAL', name: '', quantity: 1 })
    }
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urządzenie</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      const def = devices.find((d) => d.name === value)
                      if (def) form.setValue('category', def.category)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz urządzenie" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(DeviceCategory).map((cat) => {
                        const defs = devices.filter((d) => d.category === cat)
                        if (!defs.length) return null
                        return (
                          <SelectGroup key={cat}>
                            <SelectLabel>{devicesTypeMap[cat]}</SelectLabel>
                            {defs.map((d) => (
                              <SelectItem key={d.id} value={d.name}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
          <div className="flex gap-4 items-end">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Materiał</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz materiał" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.name}>
                          {m.name}
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
              name="quantity"
              render={({ field }) => (
                <FormItem className="w-24">
                  <FormLabel>Ilość</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="secondary">
            Dodaj do listy
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default AddItemForm
