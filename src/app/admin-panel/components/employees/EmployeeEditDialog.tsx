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
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PiArrowsClockwiseBold } from 'react-icons/pi'
import { toast } from 'sonner'
import { z } from 'zod'

/**
 * Validation schema for editing user data.
 * - Password is optional: if left empty, it won't be changed.
 * - Role is also optional: if omitted, it won't be changed.
 */
const employeeEditSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Imię jest wymagane'),
  email: z.string().email('Niepoprawny adres e-mail'),
  phoneNumber: z.string().min(9, 'Numer telefonu jest wymagany'),
  password: z
    .string()
    .transform((val) => (val.trim() === '' ? undefined : val))
    .refine(
      (val) =>
        val === undefined ||
        (val.length >= 8 &&
          val.length <= 32 &&
          /[a-z]/.test(val) &&
          /[A-Z]/.test(val) &&
          /\d/.test(val) &&
          /[!@#$%^&*()_+{}[\]<>?]/.test(val)),
      {
        message:
          'Hasło musi mieć 8-32 znaki, zawierać małą i wielką literę, cyfrę i znak specjalny',
      }
    )
    .optional(),
  role: z
    .enum(['ADMIN', 'TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN'])
    .optional(),
})

type EmployeeEditFormData = z.infer<typeof employeeEditSchema>

type EmployeeData = {
  id: string
  name: string
  email: string
  phoneNumber: string
  role: 'ADMIN' | 'TECHNICIAN' | 'COORDINATOR' | 'WAREHOUSEMAN'
}

/**
 * EmployeeEditDialog component:
 * - Allows updating employee details (name, role, phone, password).
 * - Provides a password generator for security.
 */
const EmployeeEditDialog = ({
  employee,
  onClose,
}: {
  employee: EmployeeData
  onClose: () => void
}) => {
  const [isSpinning, setIsSpinning] = useState(false)

  const trpcUtils = trpc.useUtils()

  const updateEmployeeMutation = trpc.user.editUser.useMutation({
    onSuccess: () => {
      toast.success('Dane technika zostały zmienione.')
      trpcUtils.user.getTechnicians.invalidate()
    },
    onError: () => toast.error('Błąd podczas aktualizacji danych.'),
  })

  const form = useForm<EmployeeEditFormData>({
    resolver: zodResolver(employeeEditSchema),
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
   * Handles updating the employee's details.
   */
  const handleSave = async (values: EmployeeEditFormData) => {
    await updateEmployeeMutation.mutateAsync({
      ...values,
      password: values.password || undefined,
    })
    onClose()
  }

  useEffect(() => {
    if (employee) {
      form.reset({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        role: employee.role,
        password: '',
      })
    }
  }, [employee, form])

  if (!employee) return null

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent aria-describedby="">
        <DialogHeader>
          <DialogTitle>Edytuj pracownika</DialogTitle>
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
                      className="border border-input bg-background text-foreground rounded-md p-2 w-full"
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
                  <FormLabel>Nowe hasło</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} readOnly />
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
              <Button type="submit" variant="success">
                Zapisz
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EmployeeEditDialog
