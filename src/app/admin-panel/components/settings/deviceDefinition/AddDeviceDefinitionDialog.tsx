'use client'

import { deviceSchema } from '@/app/(modules)/vectra-crm/lib/schema'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { devicesTypeMap } from '@/lib/constants'
import { DeviceFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { DeviceCategory } from '@prisma/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'

/**
 * AddDeviceDefinitionDialog:
 * A modal form to create a new device subcategory with alerts and price.
 * Includes duplicate check against existing entries.
 */

type Props = {
  categories: DeviceCategory[]
}

const AddDeviceDefinitionDialog = ({ categories }: Props) => {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()

  // Fetch existing device definitions
  const { data: allDefinitions } =
    trpc.deviceDefinition.getAllDefinitions.useQuery()

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: '',
      category: 'OTHER',
      warningAlert: 10,
      alarmAlert: 5,
      price: 0,
    },
  })

  const mutation = trpc.deviceDefinition.createDefinition.useMutation({
    onSuccess: () => {
      toast.success('Dodano nową podkategorię.')
      utils.deviceDefinition.getAllDefinitions.invalidate()
      setOpen(false)
      form.reset()
    },
    onError: () => toast.error('Błąd podczas dodawania.'),
  })

  const onSubmit = (data: DeviceFormData) => {
    const trimmedName = data.name.trim()
    const alreadyExists = allDefinitions?.some(
      (def) =>
        def.name.toLowerCase() === trimmedName.toLowerCase() &&
        def.category === data.category
    )

    if (alreadyExists) {
      toast.error('Takie urządzenie już istnieje w danej kategorii.')
      return
    }

    mutation.mutate({
      ...data,
      name: trimmedName,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="success">
          <MdAdd />
          Dodaj podkategorię
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nową podkategorię</DialogTitle>
          <DialogDescription>
            Wybierz kategorię urządzenia, nazwę, cenę oraz progi ostrzeżeń.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategoria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz kategorię" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {devicesTypeMap[cat]}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa podkategorii</FormLabel>
                  <FormControl>
                    <Input placeholder="np. HUAWEI EG8145X6" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cena</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warningAlert"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert ostrzegawczy (niski stan)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alarmAlert"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert krytyczny (bardzo niski stan)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={form.formState.isSubmitting || mutation.isLoading}
              className="w-full"
            >
              {form.formState.isSubmitting || mutation.isLoading
                ? 'Zapisywanie...'
                : 'Zapisz'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddDeviceDefinitionDialog
