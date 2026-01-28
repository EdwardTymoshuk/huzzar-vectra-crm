'use client'

import { oplDeviceTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import { deviceSchema } from '@/app/(modules)/opl-crm/lib/schema'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { DeviceFormData } from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { OplDeviceCategory, OplDeviceDefinition } from '@prisma/client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  item: OplDeviceDefinition & { id: string }
  categories: OplDeviceCategory[]
}

/**
 * EditDeviceDefinitionDialog:
 * Modal for editing an existing device definition with alerts, price.
 */
const EditDeviceDefinitionDialog = ({
  open,
  onClose,
  item,
  categories,
}: Props) => {
  const utils = trpc.useUtils()

  // Fetch existing device definitions
  const { data: allDefinitions } =
    trpc.opl.settings.getAllOplDeviceDefinitions.useQuery()

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: item.name,
      category: item.category,
      price: item.price ?? 0,
      warningAlert: item.warningAlert ?? 5,
      alarmAlert: item.alarmAlert ?? 10,
    },
  })

  useEffect(() => {
    form.reset({
      name: item.name,
      category: item.category,
      price: item.price ?? 0,
      warningAlert: item.warningAlert ?? 5,
      alarmAlert: item.alarmAlert ?? 10,
    })
  }, [item, form])

  const mutation = trpc.opl.settings.editOplDeviceDefinition.useMutation({
    onSuccess: () => {
      toast.success('Urządzenie zostało zaktualizowane.')
      utils.opl.settings.getAllOplDeviceDefinitions.invalidate()
      onClose()
    },
    onError: () => toast.error('Błąd podczas edycji.'),
  })

  const onSubmit = (data: DeviceFormData) => {
    const trimmedName = data.name.trim()
    const alreadyExists = allDefinitions?.some(
      (def) =>
        def.id !== item.id &&
        def.name.toLowerCase() === trimmedName.toLowerCase() &&
        def.category === data.category
    )

    if (alreadyExists) {
      toast.error(
        'Takie urządzenie już istnieje w danej kategorii i operatorze.'
      )
      return
    }

    mutation.mutate({
      id: item.id,
      ...data,
      name: trimmedName,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj urządzenie</DialogTitle>
          <DialogDescription>
            Zmień kategorię, operatora, nazwę, cenę lub progi ostrzeżeń.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category */}
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
                          {oplDeviceTypeMap[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa urządzenia</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="np. HUAWEI EG8145X6" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price */}
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

            {/* Alerts */}
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

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isLoading}
            >
              {mutation.isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditDeviceDefinitionDialog
