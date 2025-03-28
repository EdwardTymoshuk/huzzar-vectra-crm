'use client'

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
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Nazwa jest wymagana'),
})

type FormData = z.infer<typeof schema>

/**
 * AddMaterialDefinitionDialog:
 * A modal form to create a new material name definition.
 */
const AddMaterialDefinitionDialog = () => {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
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

  const onSubmit = (data: FormData) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Dodaj materiał</Button>
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
                    <Input placeholder="np. WTYK F RG-6" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit">Dodaj</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddMaterialDefinitionDialog
