'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { FC, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const editRateSchema = z.object({
  code: z.string().min(1, 'Kod jest wymagany'),
  amount: z.number().min(0, 'Stawka nie może być ujemna'),
})
type EditRateFormData = z.infer<typeof editRateSchema>

type RateDefinition = {
  id: string
  code: string
  amount: number
}

interface EditRateDefinitionDialogProps {
  open: boolean
  item: RateDefinition
  onClose: () => void
}

const EditRateDefinitionDialog: FC<EditRateDefinitionDialogProps> = ({
  open,
  item,
  onClose,
}) => {
  const utils = trpc.useUtils()
  const editMutation = trpc.rateDefinition.editRate.useMutation({
    onSuccess: () => {
      toast.success('Stawka została zaktualizowana.')
      utils.rateDefinition.getAllRates.invalidate()
      onClose()
    },
    onError: () => {
      toast.error('Błąd podczas edycji stawki.')
    },
  })

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditRateFormData>({
    resolver: zodResolver(editRateSchema),
    defaultValues: {
      code: item.code,
      amount: item.amount,
    },
  })

  // Jeśli item się zmieni (np. otwieramy dialog dla innej stawki),
  // wypełnij nowymi wartościami
  useEffect(() => {
    setValue('code', item.code)
    setValue('amount', item.amount)
  }, [item, setValue])

  const onSubmit = (data: EditRateFormData) => {
    editMutation.mutate({
      id: item.id,
      ...data,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj stawkę</DialogTitle>
          <DialogDescription>
            Zaktualizuj kod czynności i kwotę stawki.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Kod</Label>
            <Input placeholder="Kod" {...register('code')} />
            {errors.code && (
              <p className="text-danger text-sm">{errors.code.message}</p>
            )}
          </div>

          <div>
            <Label>Stawka (zł)</Label>
            <Input
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-danger text-sm">{errors.amount.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || editMutation.isLoading}
          >
            {isSubmitting || editMutation.isLoading
              ? 'Zapisywanie...'
              : 'Zapisz zmiany'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditRateDefinitionDialog
