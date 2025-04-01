'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { devicesTypeMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { DeviceCategory, WarehouseItemType } from '@prisma/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

/**
 * Schema for a single item being added to the warehouse.
 * Supports validation for both devices and materials.
 */
const itemSchema = z.object({
  type: z.nativeEnum(WarehouseItemType),
  category: z.nativeEnum(DeviceCategory).optional(),
  name: z.string().min(2, 'Nazwa jest wymagana'),
  serialNumber: z
    .string()
    .min(3, 'Numer seryjny musi mieć minimum 3 znaki')
    .max(50, 'Numer seryjny może mieć maksymalnie 50 znaków')
    .transform((val) => val.toUpperCase())
    .optional(),
  quantity: z.coerce.number().min(1, 'Minimalna ilość to 1').default(1),
})

type ItemFormData = z.infer<typeof itemSchema>

const defaultFormValues: ItemFormData = {
  type: 'DEVICE',
  category: undefined,
  name: '',
  serialNumber: '',
  quantity: 1,
}

/**
 * Modal component for adding new warehouse items (devices or materials).
 * - Displays grouped select options for devices.
 * - Allows serial number input for devices.
 * - Allows quantity input for materials.
 * - Shows a list of added items.
 * - Enables clearing individual or all items with confirmation.
 */
const AddModal = ({
  open,
  onCloseAction,
}: {
  open: boolean
  onCloseAction: () => void
}) => {
  const [items, setItems] = useState<ItemFormData[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const utils = trpc.useUtils()

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: defaultFormValues,
  })

  // Fetch available device deviceDefinitions from server
  const { data: deviceDefinitions = [] } =
    trpc.deviceDefinition.getAllDefinitions.useQuery()

  const { data: materialDefinitions = [] } =
    trpc.materialDefinition.getAll.useQuery()

  // tRPC mutation for saving items to the database
  const addMutation = trpc.warehouse.addItems.useMutation({
    onSuccess: () => {
      toast.success('Sprzęt został przyjęty na magazyn.')
      utils.warehouse.getAll.invalidate()
      setItems([])
      onCloseAction()
    },
    onError: () => toast.error('Błąd podczas zapisywania sprzętu.'),
  })

  // Adds a single item to the temporary list
  const handleAddItem = (data: ItemFormData) => {
    setItems((prev) => [...prev, data])
    toast.success('Dodano do listy.')
    if (data.type === 'DEVICE') {
      form.reset({
        ...data,
        serialNumber: '',
      })
    } else {
      form.reset({
        type: 'MATERIAL',
        name: '',
        quantity: 1,
      })
    }
  }

  // Submits the entire item list to the backend
  const handleSubmit = () => {
    if (items.length === 0) {
      toast.warning('Dodaj przynajmniej jeden element.')
      return
    }
    addMutation.mutate({ items })
  }

  // Removes a single item by index
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Clears the entire item list after confirmation
  const clearAll = () => {
    setItems([])
    setConfirmOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Przyjęcie do magazynu</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleAddItem)}
            className="grid grid-cols-1 gap-4"
          >
            {/* Type selection (device or material) */}
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

            {/* DEVICE inputs: name and serial number */}
            {form.watch('type') === 'DEVICE' && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa urządzenia</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          const selectedDef = deviceDefinitions.find(
                            (def) => def.name === value
                          )
                          if (selectedDef) {
                            form.setValue('category', selectedDef.category)
                          }
                        }}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz urządzenie" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(DeviceCategory).map((cat) => {
                            const filtered = deviceDefinitions.filter(
                              (d) => d.category === cat
                            )
                            if (filtered.length === 0) return null
                            return (
                              <SelectGroup key={cat}>
                                <SelectLabel>{devicesTypeMap[cat]}</SelectLabel>
                                {filtered.map((def) => (
                                  <SelectItem key={def.id} value={def.name}>
                                    {def.name}
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
                        <FormControl>
                          <Input
                            placeholder="Wpisz numer seryjny"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* MATERIAL inputs: name and quantity in same row */}
            {form.watch('type') === 'MATERIAL' && (
              <div className="flex items-end gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Nazwa materiału</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz materiał" />
                        </SelectTrigger>
                        <SelectContent>
                          {materialDefinitions.map((def) => (
                            <SelectItem key={def.id} value={def.name}>
                              {def.name}
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

            {/* Add to list button */}
            <div className="flex justify-end">
              <Button type="submit" variant="secondary">
                Dodaj do listy
              </Button>
            </div>
          </form>
        </Form>

        {/* Display of added items grouped by type */}
        {items.length > 0 && (
          <div className="space-y-4 mt-4">
            {/* Devices */}
            {items.some((i) => i.type === 'DEVICE') && (
              <div>
                <h4 className="text-md font-semibold mb-2">
                  Urządzenia ({items.filter((i) => i.type === 'DEVICE').length})
                </h4>
                <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
                  {items
                    .filter((i) => i.type === 'DEVICE')
                    .map((item, idx) => (
                      <li
                        key={`device-${idx}`}
                        className="border rounded p-2 flex justify-between items-center"
                      >
                        <span>
                          {item.name} | SN: {item.serialNumber}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(idx)}
                          className="text-danger hover:bg-danger hover:text-background"
                        >
                          Usuń
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Materials */}
            {items.some((i) => i.type === 'MATERIAL') && (
              <div>
                <h4 className="text-md font-semibold mb-2">
                  Materiały ({items.filter((i) => i.type === 'MATERIAL').length}
                  )
                </h4>
                <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
                  {items
                    .filter((i) => i.type === 'MATERIAL')
                    .map((item, idx) => (
                      <li
                        key={`material-${idx}`}
                        className="border rounded p-2 flex justify-between items-center"
                      >
                        <span>
                          {item.name} | Ilość: {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(idx)}
                        >
                          Usuń
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Actions: Save and Clear */}
            <div className="flex justify-end gap-2 pt-2">
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-danger hover:bg-danger border-danger hover:text-primary-foreground"
                  >
                    Wyczyść wszystko
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Czy na pewno chcesz usunąć wszystkie pozycje?
                    </AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAll}>
                      Wyczyść
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="success"
                disabled={form.formState.isSubmitting || addMutation.isLoading}
                onClick={handleSubmit}
              >
                {form.formState.isSubmitting || addMutation.isLoading
                  ? 'Zapisywanie...'
                  : 'Zapisz w magazynie'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddModal
