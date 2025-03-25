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
 * Zod schema for employee form validation.
 */
const employeeSchema = z.object({
  name: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  email: z.string().email('Niepoprawny adres email'),
  phoneNumber: z.string().min(6, 'Numer telefonu jest wymagany'),
  role: z.enum(['TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN', 'ADMIN']),
  password: z
    .string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków')
    .max(32, 'Hasło nie może mieć więcej niż 32 znaki')
    .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
    .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
    .regex(/\d/, 'Hasło musi zawierać cyfrę')
    .regex(/[!@#$%^&*()_+{}[\]<>?]/, 'Hasło musi zawierać znak specjalny'),
})

/**
 * AddEmployeeDialog component:
 * - Allows adding a new employee with validation.
 * - Provides a password generator for security.
 */
const AddEmployeeDialog = ({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) => {
  const [isSpinning, setIsSpinning] = useState(false)

  const trpcUtils = trpc.useUtils()

  const createEmployeeMutation = trpc.user.createUser.useMutation({
    onSuccess: () => {
      trpcUtils.user.getTechnicians.invalidate()
      onClose()
    },
  })

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      role: 'TECHNICIAN',
      password: '',
    },
  })

  /**
   * Generates a strong password and sets it in the form field.
   */
  const handleGeneratePassword = () => {
    const password = generateStrongPassword()
    form.setValue('password', password, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setIsSpinning(true)
    setTimeout(() => {
      setIsSpinning(false)
    }, 500)
    toast.success('Wygenerowano silne hasło.')
  }

  /**
   * Handles saving a new employee.
   */
  const handleSave = async (values: z.infer<typeof employeeSchema>) => {
    await createEmployeeMutation.mutateAsync(values)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj pracownika</DialogTitle>
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
                  <FormLabel>Email</FormLabel>
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
                      className="border rounded-md p-2 w-full bg-white"
                    >
                      <option value="TECHNICIAN">Technik</option>
                      <option value="COORDINATOR">Koordynator</option>
                      <option value="WAREHOUSEMAN">Magazynier</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Password + Generate Button */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
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
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={createEmployeeMutation.isLoading}
              >
                {createEmployeeMutation.isLoading ? 'Dodawanie...' : 'Dodaj'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddEmployeeDialog
