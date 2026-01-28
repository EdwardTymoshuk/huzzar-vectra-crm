'use client'

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
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'
import { z } from 'zod'

// Schema for a new operator
const operatorSchema = z.object({
  operator: z
    .string()
    .min(2, 'Nazwa operatora jest wymagana')
    .max(50, 'Za długa nazwa'),
})

type OperatorFormData = z.infer<typeof operatorSchema>

/**
 * AddOperatorDialog:
 * A modal form to create a new operator (e.g., Opl, MMP).
 */
const AddOperatorDefinitionDialog = () => {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()

  const form = useForm<OperatorFormData>({
    resolver: zodResolver(operatorSchema),
    defaultValues: {
      operator: '',
    },
  })

  const mutation = trpc.opl.settings.createOplOperatorDefinition.useMutation({
    onSuccess: () => {
      toast.success('Dodano nowego operatora.')
      utils.opl.settings.getAllOplOperatorDefinitions.invalidate()
      setOpen(false)
      form.reset()
    },
    onError: () => toast.error('Błąd podczas dodawania operatora.'),
  })

  const onSubmit = (data: OperatorFormData) => {
    mutation.mutate({
      operator: data.operator.trim().toUpperCase(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="success">
          <MdAdd />
          Dodaj operatora
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nowego operatora</DialogTitle>
          <DialogDescription>
            Wprowadź nazwę nowego operatora (np. Opl, MMP).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa operatora</FormLabel>
                  <FormControl>
                    <Input placeholder="np. MMP, Opl, Orange" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

export default AddOperatorDefinitionDialog
