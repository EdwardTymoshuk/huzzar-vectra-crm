'use client'

import { materialSchema } from '@/app/(modules)/vectra-crm/lib/schema'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { MaterialFormData } from '@/types'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'

/**
 * AddMaterialDefinitionDialog:
 * A modal form to create a new material name definition with alerts, unit and index.
 * Prevents duplicates based on name or index.
 */
const AddMaterialDefinitionDialog = () => {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()

  const { data: allMaterials } = trpc.materialDefinition.getAll.useQuery()

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: '',
      index: '',
      unit: 'PIECE',
      warningAlert: 10,
      alarmAlert: 5,
      price: 0,
    },
  })

  const mutation = trpc.materialDefinition.create.useMutation({
    onSuccess: () => {
      toast.success('Dodano nowy materiał.')
      utils.materialDefinition.getAll.invalidate()
      setOpen(false)
      form.reset()
    },
    onError: () => toast.error('Błąd podczas dodawania.'),
  })

  const onSubmit = (data: MaterialFormData) => {
    const trimmedName = data.name.trim().toLowerCase()
    const trimmedIndex = data.index.trim().toLowerCase()

    const duplicatedName = allMaterials?.some((m) => {
      const name = m.name?.trim().toLowerCase() || ''
      return name === trimmedName
    })

    const duplicatedIndex = allMaterials?.some((m) => {
      const index = m.index?.trim().toLowerCase() || ''
      return index === trimmedIndex
    })

    if (duplicatedName) {
      return toast.error('Materiał o tej nazwie już istnieje.')
    }

    if (duplicatedIndex) {
      return toast.error('Materiał o tym indeksie już istnieje.')
    }

    mutation.mutate({
      ...data,
      name: data.name.trim(),
      index: data.index.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="success">
          <MdAdd /> Dodaj materiał
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj materiał</DialogTitle>
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
                    <Input
                      placeholder="np. PATCHCORD SC/APC-SC/APC SIMPL 1,5mb"
                      {...field}
                    />
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
                    <Input placeholder="np. 123-ABC-X2" {...field} />
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
                      <SelectValue placeholder="Wybierz jednostkę" />
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
                    <Input type="number" min={0} step="0.1" {...field} />
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

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isLoading}>
                {mutation.isLoading ? 'Dodawanie...' : 'Dodaj'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddMaterialDefinitionDialog
