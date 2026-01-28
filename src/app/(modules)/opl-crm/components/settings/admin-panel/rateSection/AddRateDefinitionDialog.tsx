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
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { FC, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'
import { z } from 'zod'

const createRateSchema = z.object({
  code: z.string().min(1, 'Kod jest wymagany'),
  amount: z.number().min(0, 'Stawka nie może być ujemna'),
})
type CreateRateFormData = z.infer<typeof createRateSchema>

/**
 * AddRateDefinitionDialog:
 * Allows creating a new OplRateDefinition (code + amount).
 */
const AddRateDefinitionDialog: FC = () => {
  const [open, setOpen] = useState(false)

  const utils = trpc.useUtils()
  const createMutation = trpc.opl.settings.createOplRate.useMutation({
    onSuccess: () => {
      toast.success('Dodano nową stawkę.')
      utils.opl.settings.getAllOplRates.invalidate()
      reset()
      setOpen(false)
    },
    onError: () => {
      toast.error('Błąd podczas dodawania stawki.')
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRateFormData>({
    resolver: zodResolver(createRateSchema),
  })

  const onSubmit = (data: CreateRateFormData) => {
    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="success">
          <MdAdd /> Dodaj stawkę
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nową stawkę</DialogTitle>
          <DialogDescription>
            Podaj kod czynności i kwotę stawki (zł).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Kod</Label>
            <Input placeholder="np. W1" {...register('code')} />
            {errors.code && (
              <p className="text-danger text-sm">{errors.code.message}</p>
            )}
          </div>

          <div>
            <Label>Stawka (zł)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="100.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-danger text-sm">{errors.amount.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isLoading}
            className="w-full"
          >
            {isSubmitting || createMutation.isLoading
              ? 'Zapisywanie...'
              : 'Zapisz'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddRateDefinitionDialog
