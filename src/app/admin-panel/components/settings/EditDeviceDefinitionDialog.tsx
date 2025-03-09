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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { FC, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const editDefinitionSchema = z.object({
  category: z.enum(['MODEM', 'DECODER', 'ONT', 'AMPLIFIER', 'OTHER']),
  name: z.string().min(2, 'Nazwa jest wymagana'),
})
type EditDefinitionFormData = z.infer<typeof editDefinitionSchema>

type DeviceDefinition = {
  id: string
  category: 'MODEM' | 'DECODER' | 'ONT' | 'AMPLIFIER' | 'OTHER'
  name: string
}

interface EditDeviceDefinitionDialogProps {
  open: boolean
  item: DeviceDefinition
  onClose: () => void
}

/**
 * EditDeviceDefinitionDialog:
 * Allows editing an existing device definition (category + name).
 */
const EditDeviceDefinitionDialog: FC<EditDeviceDefinitionDialogProps> = ({
  open,
  item,
  onClose,
}) => {
  const utils = trpc.useUtils()
  const editMutation = trpc.deviceDefinition.editDefinition.useMutation({
    onSuccess: () => {
      toast.success('Podkategoria została zaktualizowana.')
      utils.deviceDefinition.getAllDefinitions.invalidate()
      onClose()
    },
    onError: () => toast.error('Błąd podczas edycji.'),
  })

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditDefinitionFormData>({
    resolver: zodResolver(editDefinitionSchema),
    defaultValues: {
      category: item.category,
      name: item.name,
    },
  })

  useEffect(() => {
    setValue('category', item.category)
    setValue('name', item.name)
  }, [item, setValue])

  const onSubmit = (data: EditDefinitionFormData) => {
    editMutation.mutate({
      id: item.id,
      ...data,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj podkategorię</DialogTitle>
          <DialogDescription>
            Zmień kategorię lub nazwę podkategorii.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Kategoria</Label>
            <Select
              onValueChange={(val) =>
                setValue('category', val as EditDefinitionFormData['category'])
              }
              defaultValue={item.category}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategoria" />
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
            <Label>Nazwa</Label>
            <Input {...register('name')} placeholder="np. FunBox 6" />
            {errors.name && (
              <p className="text-danger text-sm">{errors.name.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || editMutation.isLoading}
            className="w-full"
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

export default EditDeviceDefinitionDialog
