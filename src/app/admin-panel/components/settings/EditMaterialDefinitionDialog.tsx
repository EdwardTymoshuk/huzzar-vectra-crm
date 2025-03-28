'use client'

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
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const schema = z.object({
  id: z.string(),
  name: z.string().min(2),
})

type Props = {
  open: boolean
  onClose: () => void
  item: { id: string; name: string }
}

/**
 * EditMaterialDefinitionDialog:
 * Modal form for editing existing material names.
 */
const EditMaterialDefinitionDialog = ({ open, onClose, item }: Props) => {
  const utils = trpc.useUtils()

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { ...item },
  })

  const mutation = trpc.materialDefinition.edit.useMutation({
    onSuccess: () => {
      toast.success('Materiał został zaktualizowany.')
      utils.materialDefinition.getAll.invalidate()
      onClose()
    },
    onError: () => toast.error('Błąd podczas edycji.'),
  })

  const onSubmit = (data: z.infer<typeof schema>) => mutation.mutate(data)

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
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                Zapisz
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditMaterialDefinitionDialog
