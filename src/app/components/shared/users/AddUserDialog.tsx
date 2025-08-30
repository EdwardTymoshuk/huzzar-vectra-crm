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
import { generateStrongPassword } from '@/utils/passwordGenerator'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PiArrowsClockwiseBold } from 'react-icons/pi'
import { toast } from 'sonner'
import { z } from 'zod'

/**
 * Validation schema matching backend user creation input.
 */
const userFormSchema = z.object({
  name: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  email: z.string().email('Niepoprawny adres e-mail'),
  phoneNumber: z.string().min(6, 'Numer telefonu jest wymagany'),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN']),
  password: z
    .string()
    .min(8, 'Min. 8 znaków')
    .max(32, 'Max. 32 znaki')
    .regex(/[a-z]/, 'Musi zawierać małą literę')
    .regex(/[A-Z]/, 'Musi zawierać wielką literę')
    .regex(/\d/, 'Musi zawierać cyfrę')
    .regex(/[!@#$%^&*()_+{}[\]<>?]/, 'Musi zawierać znak specjalny'),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface AddUserDialogProps {
  open: boolean
  onClose: () => void
  defaultRole: UserFormValues['role']
}

/**
 * AddUserDialog:
 * - Nie zawiera własnego triggera.
 * - Otwierany i zamykany tylko przez propsy open / onClose (kontrolowany przez rodzica).
 * - Po dodaniu użytkownika zamyka się i resetuje formularz.
 */
const AddUserDialog = ({ open, onClose, defaultRole }: AddUserDialogProps) => {
  const [isSpinning, setIsSpinning] = useState(false)

  const utils = trpc.useUtils()

  const createUserMutation = trpc.user.createUser.useMutation({
    onSuccess: () => {
      utils.user.getAdmins.invalidate().catch(() => {})
      utils.user.getTechnicians.invalidate().catch(() => {})
    },
  })

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      role: defaultRole,
      password: '',
    },
  })

  const handleGeneratePassword = () => {
    const pwd = generateStrongPassword()
    form.setValue('password', pwd, { shouldValidate: true, shouldDirty: true })
    setIsSpinning(true)
    setTimeout(() => setIsSpinning(false), 500)
    toast.success('Wygenerowano silne hasło.')
  }

  const handleSave = async (values: UserFormValues) => {
    try {
      await createUserMutation.mutateAsync(values)
      toast.success('Użytkownik został utworzony. Wysłano e-mail powitalny.')
      form.reset()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ??
        'Błąd podczas dodawania użytkownika.'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj użytkownika</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię i nazwisko</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres e-mail</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numer telefonu</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rola</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border border-input bg-background text-foreground rounded-md p-2 w-full"
                    >
                      <option value="ADMIN">Administrator</option>
                      <option value="TECHNICIAN">Technik</option>
                      <option value="COORDINATOR">Koordynator</option>
                      <option value="WAREHOUSEMAN">Magazynier</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło (tymczasowe)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGeneratePassword}
                    >
                      <PiArrowsClockwiseBold
                        className={isSpinning ? 'animate-spin' : ''}
                      />{' '}
                      Wygeneruj
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={createUserMutation.isLoading}>
                {createUserMutation.isLoading ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddUserDialog
