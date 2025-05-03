'use client'

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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { materialSchema } from '@/lib/schema'
import { MaterialFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  item: {
    id: string
    name: string
    index: string
    unit: 'PIECE' | 'METER'
    warningAlert: number
    alarmAlert: number
    price: number
  }
}

const EditMaterialDefinitionDialog = ({ open, onClose, item }: Props) => {
  const utils = trpc.useUtils()

  const { data: allMaterials = [] } = trpc.materialDefinition.getAll.useQuery()

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: item,
  })

  useEffect(() => {
    form.reset(item)
  }, [item, form])

  const mutation = trpc.materialDefinition.edit.useMutation({
    onSuccess: () => {
      toast.success('Materiał został zaktualizowany.')
      utils.materialDefinition.getAll.invalidate()
      onClose()
    },
    onError: () => toast.error('Błąd podczas edycji.'),
  })

  const onSubmit = (data: MaterialFormData) => {
    const name = data.name.trim()
    const index = data.index.trim()

    const isNameTaken = allMaterials.some(
      (m) => m.name === name && m.id !== item.id
    )
    const isIndexTaken = allMaterials.some(
      (m) => m.index === index && m.id !== item.id
    )

    if (isNameTaken) {
      return toast.error('Materiał o tej nazwie już istnieje.')
    }

    if (isIndexTaken) {
      return toast.error('Materiał o tym indeksie już istnieje.')
    }

    mutation.mutate({
      id: item.id,
      ...data,
      name,
      index,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj materiał</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa materiału</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="index"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Index dostawcy</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jednostka</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Jednostka" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIECE">Sztuka</SelectItem>
                      <SelectItem value="METER">Metr</SelectItem>
                    </SelectContent>
                  </Select>
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

            <FormField
              control={form.control}
              name="warningAlert"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert ostrzegawczy</FormLabel>
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
                  <FormLabel>Alert krytyczny</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isLoading}>
                {mutation.isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditMaterialDefinitionDialog
