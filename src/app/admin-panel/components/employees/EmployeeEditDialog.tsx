'use client'

import { Button } from '@/app/components/ui/button'
import { Checkbox } from '@/app/components/ui/checkbox'
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
import { VectraUserWithLocations } from '@/types'
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
 */
const employeeEditSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Imię jest wymagane'),
  email: z.string().email('Niepoprawny adres e-mail'),
  phoneNumber: z.string().min(9, 'Numer telefonu jest wymagany'),
  role: z
    .enum(['ADMIN', 'TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN'])
    .optional(),
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
  locationIds: z
    .array(z.string())
    .min(1, 'Wybierz przynajmniej jedną lokalizację'),
})

type EmployeeEditFormData = z.infer<typeof employeeEditSchema>

const EmployeeEditDialog = ({
  employee,
  onClose,
}: {
  employee: VectraUserWithLocations
  onClose: () => void
}) => {
  const [isSpinning, setIsSpinning] = useState(false)

  const trpcUtils = trpc.useUtils()

  const { data: locations, isLoading: isLoadingLocations } =
    trpc.warehouse.getAllLocations.useQuery()

  const updateEmployeeMutation = trpc.user.editUser.useMutation({
    onSuccess: () => {
      toast.success('Dane użytkownika zostały zaktualizowane.')
      trpcUtils.user.getTechnicians.invalidate()
      trpcUtils.user.getAdmins.invalidate()
    },
    onError: () => toast.error('Błąd podczas aktualizacji danych.'),
  })

  const form = useForm<EmployeeEditFormData>({
    resolver: zodResolver(employeeEditSchema),
    defaultValues: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber,
      role: employee.role,
      password: '',
      locationIds: employee.locations?.map((l) => l.id) ?? [],
    },
  })

  const handleGeneratePassword = () => {
    const password = generateStrongPassword()
    form.setValue('password', password, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setIsSpinning(true)
    setTimeout(() => setIsSpinning(false), 500)
    toast.success('Wygenerowano silne hasło.')
  }

  const handleSave = async (values: EmployeeEditFormData) => {
    await updateEmployeeMutation.mutateAsync(values)
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
        locationIds: employee.locations?.map((l) => l.id) ?? [],
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

            {/* Lokalizacje */}
            <FormField
              control={form.control}
              name="locationIds"
              render={() => (
                <FormItem>
                  <FormLabel>Lokalizacje</FormLabel>
                  <div className="space-y-2">
                    {isLoadingLocations && (
                      <p className="text-sm text-muted-foreground">
                        Ładowanie lokalizacji...
                      </p>
                    )}
                    {locations?.map((loc) => (
                      <FormField
                        key={loc.id}
                        control={form.control}
                        name="locationIds"
                        render={({ field }) => (
                          <FormItem
                            key={loc.id}
                            className="flex flex-row items-center space-x-3"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(loc.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, loc.id])
                                  } else {
                                    field.onChange(
                                      field.value.filter((id) => id !== loc.id)
                                    )
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {loc.name}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password + Generate */}
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
