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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { generateStrongPassword } from '@/utils/passwordGenerator'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PiArrowsClockwiseBold } from 'react-icons/pi'
import { toast } from 'sonner'
import { z } from 'zod'

/**
 * Validation schema for creating a new system user.
 * Matches Kadry backend input.
 */
const createUserSchema = z.object({
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
  moduleIds: z.array(z.string()).min(1, 'Przypisz przynajmniej jeden moduł'),
})

type CreateUserFormValues = z.infer<typeof createUserSchema>

/**
 * CreateUserDialog (Kadry)
 * ------------------------------------------------------------------
 * Allows ADMIN to create a new user:
 * - assigns global role
 * - assigns modules
 * - generates temporary password
 */
const CreateUserDialog = () => {
  const [open, setOpen] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)

  const utils = trpc.useUtils()

  const { data: modules, isLoading: isLoadingModules } =
    trpc.core.user.getModules.useQuery()

  const createUserMutation = trpc.hr.user.createUser.useMutation({
    onSuccess: () => {
      utils.hr.user.getUsers.invalidate().catch(() => {})
    },
  })

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      role: 'TECHNICIAN',
      password: '',
      moduleIds: [],
    },
  })

  /**
   * Generates a strong temporary password and fills the form field.
   */
  const handleGeneratePassword = () => {
    const pwd = generateStrongPassword()
    form.setValue('password', pwd, { shouldDirty: true, shouldValidate: true })
    setIsSpinning(true)
    setTimeout(() => setIsSpinning(false), 500)
    toast.success('Wygenerowano silne hasło.')
  }

  /**
   * Submits form and creates a new user.
   */
  const handleSubmit = async (values: CreateUserFormValues) => {
    try {
      await createUserMutation.mutateAsync(values)
      toast.success('Użytkownik został utworzony.')
      form.reset()
      setOpen(false)
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ??
        'Błąd podczas tworzenia użytkownika.'
      toast.error(msg)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Dodaj użytkownika</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj użytkownika</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Name */}
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

              {/* Email */}
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

              {/* Role */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rola</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz rolę" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrator</SelectItem>
                          <SelectItem value="COORDINATOR">
                            Koordynator
                          </SelectItem>
                          <SelectItem value="TECHNICIAN">Technik</SelectItem>
                          <SelectItem value="WAREHOUSEMAN">
                            Magazynier
                          </SelectItem>
                        </SelectContent>
                      </Select>
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

              {/* Modules */}
              <FormField
                control={form.control}
                name="moduleIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Moduły</FormLabel>
                    <div className="space-y-2">
                      {isLoadingModules && (
                        <p className="text-sm text-muted-foreground">
                          Ładowanie modułów...
                        </p>
                      )}

                      {modules?.map((module) => (
                        <FormField
                          key={module.id}
                          control={form.control}
                          name="moduleIds"
                          render={({ field }) => (
                            <FormItem
                              key={module.id}
                              className="flex flex-row items-center space-x-3"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(module.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([
                                        ...field.value,
                                        module.id,
                                      ])
                                    } else {
                                      field.onChange(
                                        field.value.filter(
                                          (id) => id !== module.id
                                        )
                                      )
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {module.name}
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

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasło tymczasowe</FormLabel>
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
                        />
                        Wygeneruj
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
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
    </>
  )
}

export default CreateUserDialog
