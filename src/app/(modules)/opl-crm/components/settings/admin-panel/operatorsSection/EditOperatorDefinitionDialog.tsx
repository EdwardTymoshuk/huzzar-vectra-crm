'use client'

import { operatorSchema } from '@/app/(modules)/vectra-crm/lib/schema'
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
import { OperatorFormData } from '@/types/vectra-crm'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  item: {
    operator: string
  }
}

/**
 * EditOperatorDialog:
 * Modal for editing existing operator definition.
 */
const EditOperatorDialog = ({ open, onClose, item }: Props) => {
  const utils = trpc.useUtils()

  const form = useForm<OperatorFormData>({
    resolver: zodResolver(operatorSchema),
    defaultValues: {
      operator: item.operator,
    },
  })

  useEffect(() => {
    form.reset({ operator: item.operator })
  }, [item, form])

  const mutation = trpc.vectra.operatorDefinition.editDefinition.useMutation({
    onSuccess: () => {
      toast.success('Operator został zaktualizowany.')
      utils.vectra.operatorDefinition.getAllDefinitions.invalidate()
      onClose()
    },
    onError: () => toast.error('Błąd podczas edycji operatora.'),
  })

  const onSubmit = (data: OperatorFormData) => {
    mutation.mutate({
      oldOperator: item.operator,
      operator: data.operator.trim().toUpperCase(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj operatora</DialogTitle>
          <DialogDescription>
            Zmień nazwę operatora (np. Vectra, MMP).
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
                    <Input {...field} placeholder="np. Vectra" />
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
                : 'Zapisz zmiany'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditOperatorDialog
