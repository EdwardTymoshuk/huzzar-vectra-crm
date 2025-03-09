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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { FC, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdAdd } from 'react-icons/md'
import { toast } from 'sonner'
import { z } from 'zod'

const createDefinitionSchema = z.object({
  category: z.enum(['MODEM', 'DECODER', 'ONT', 'AMPLIFIER', 'OTHER']),
  name: z.string().min(2, 'Nazwa jest wymagana'),
})
type CreateDefinitionFormData = z.infer<typeof createDefinitionSchema>

/**
 * AddDeviceDefinitionDialog:
 * Allows creating a new subcategory (name) for a given device category.
 */
const AddDeviceDefinitionDialog: FC = () => {
  const [open, setOpen] = useState(false)

  const utils = trpc.useUtils()
  const createMutation = trpc.deviceDefinition.createDefinition.useMutation({
    onSuccess: () => {
      toast.success('Dodano nową podkategorię.')
      utils.deviceDefinition.getAllDefinitions.invalidate()
      setOpen(false)
      reset()
    },
    onError: () => toast.error('Błąd podczas dodawania.'),
  })

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDefinitionFormData>({
    resolver: zodResolver(createDefinitionSchema),
  })

  const onSubmit = (data: CreateDefinitionFormData) => {
    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MdAdd /> Dodaj podkategorię
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nową podkategorię</DialogTitle>
          <DialogDescription>
            Wybierz kategorię urządzenia i nazwę podkategorii (np. FunBox 6).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Kategoria</Label>
            <Select
              onValueChange={(val) =>
                setValue(
                  'category',
                  val as CreateDefinitionFormData['category']
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MODEM">Modem</SelectItem>
                <SelectItem value="DECODER">Dekoder</SelectItem>
                <SelectItem value="ONT">ONT</SelectItem>
                <SelectItem value="AMPLIFIER">Wzmacniacz</SelectItem>
                <SelectItem value="OTHER">Inne</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-danger text-sm">{errors.category.message}</p>
            )}
          </div>

          <div>
            <Label>Nazwa podkategorii</Label>
            <Input placeholder="np. FunBox 6" {...register('name')} />
            {errors.name && (
              <p className="text-danger text-sm">{errors.name.message}</p>
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

export default AddDeviceDefinitionDialog
