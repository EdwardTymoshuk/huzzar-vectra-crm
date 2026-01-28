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
import { NormalizedUser } from '@/server/core/helpers/users/normalizeUser'
import { generateStrongPassword } from '@/utils/passwordGenerator'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Role, UserStatus } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PiArrowsClockwiseBold } from 'react-icons/pi'
import { toast } from 'sonner'
import { z } from 'zod'

type LocationVM = {
  id: string
  name: string
}

const editUserSchema = z.object({
  userId: z.string(),
  name: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  email: z.string().email('Niepoprawny adres e-mail'),
  phoneNumber: z.string().min(6, 'Numer telefonu jest wymagany'),
  identyficator: z
    .union([z.number().int().positive(), z.nan()])
    .optional()
    .transform((v) =>
      typeof v === 'number' && !Number.isNaN(v) ? v : undefined
    ),
  role: z.custom<Role>(),
  status: z.custom<UserStatus>(),
  moduleIds: z.array(z.string()).min(1, 'Wybierz przynajmniej jeden moduł'),
  locationIds: z.array(z.string()).optional(),
  password: z
    .string()
    .transform((v) => (v.trim() === '' ? undefined : v))
    .optional(),
})

type EditUserFormValues = z.infer<typeof editUserSchema>

/**
 * EditUserDialog (HR)
 * ------------------------------------------------------------------
 * Edits global user data:
 * - core profile (name, email, phone, role, status, identyficator)
 * - module assignments
 * - optional locations assignment
 * - optional password reset
 */
const EditUserDialog = ({
  user,
  onClose,
}: {
  user: NormalizedUser
  onClose: () => void
}) => {
  const [isSpinning, setIsSpinning] = useState(false)

  const utils = trpc.useUtils()

  const { data: modules } = trpc.core.user.getModules.useQuery(undefined, {
    staleTime: 60_000,
  })

  const { data: locations } = trpc.core.user.getUserLocations.useQuery(
    undefined,
    {
      staleTime: 60_000,
    }
  )

  const updateUserMutation = trpc.hr.user.updateUser.useMutation({
    onSuccess: () => {
      utils.hr.user.getUsers.invalidate().catch(() => {})
      toast.success('Użytkownik zaktualizowany.')
      onClose()
    },
    onError: (err) => {
      toast.error(err.message || 'Błąd podczas aktualizacji użytkownika.')
    },
  })

  const defaultLocationIds = useMemo(
    () => user.locations.map((l) => l.id),
    [user.locations]
  )

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      userId: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      identyficator: user.identyficator ?? undefined,
      role: user.role,
      status: user.status,
      moduleIds: user.modules.map((m) => m.id),
      locationIds: defaultLocationIds,
      password: '',
    },
  })

  useEffect(() => {
    form.reset({
      userId: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      identyficator: user.identyficator ?? undefined,
      role: user.role,
      status: user.status,
      moduleIds: user.modules.map((m) => m.id),
      locationIds: user.locations.map((l) => l.id),
      password: '',
    })
  }, [user, form])

  /**
   * Generates a strong temporary password and fills the form field.
   */
  const handleGeneratePassword = () => {
    const pwd = generateStrongPassword()
    form.setValue('password', pwd, { shouldDirty: true, shouldValidate: true })
    setIsSpinning(true)
    setTimeout(() => setIsSpinning(false), 400)
    toast.success('Wygenerowano silne hasło.')
  }

  /**
   * Sends update request to backend.
   */
  const handleSubmit = async (values: EditUserFormValues) => {
    await updateUserMutation.mutateAsync(values)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj użytkownika</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
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
              name="identyficator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identyfikator</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        field.onChange(raw === '' ? undefined : Number(raw))
                      }}
                    />
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
                  <Select
                    value={String(field.value)}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="COORDINATOR">Koordynator</SelectItem>
                      <SelectItem value="TECHNICIAN">Technik</SelectItem>
                      <SelectItem value="WAREHOUSEMAN">Magazynier</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktywny</SelectItem>
                      <SelectItem value="SUSPENDED">Zablokowany</SelectItem>
                      <SelectItem value="INACTIVE">Archiwum</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modules */}
            <FormField
              control={form.control}
              name="moduleIds"
              render={({ field }) => {
                const value = field.value ?? []

                return (
                  <FormItem>
                    <FormLabel>Moduły</FormLabel>
                    <div className="space-y-2">
                      {(modules ?? []).map((m) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <Checkbox
                            checked={value.includes(m.id)}
                            onCheckedChange={(checked) => {
                              field.onChange(
                                checked
                                  ? [...value, m.id]
                                  : value.filter((id) => id !== m.id)
                              )
                            }}
                          />
                          <div>
                            <div className="text-sm">{m.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.code}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            {/* Locations (optional) */}
            <FormField
              control={form.control}
              name="locationIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokalizacje</FormLabel>
                  <div className="space-y-2">
                    {(locations ?? []).map((l: LocationVM) => (
                      <div key={l.id} className="flex items-center gap-3">
                        <Checkbox
                          checked={(field.value ?? []).includes(l.id)}
                          onCheckedChange={(checked) => {
                            const current = field.value ?? []
                            if (checked) field.onChange([...current, l.id])
                            else
                              field.onChange(
                                current.filter((id) => id !== l.id)
                              )
                          }}
                        />
                        <div className="text-sm">{l.name}</div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password reset */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nowe hasło</FormLabel>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Anuluj
              </Button>
              <Button type="submit" disabled={updateUserMutation.isLoading}>
                {updateUserMutation.isLoading ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditUserDialog
