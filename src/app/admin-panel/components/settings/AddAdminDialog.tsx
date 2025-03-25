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
import { generateStrongPassword } from '@/utils/passwordGenerator'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdAdd } from 'react-icons/md'
import { PiArrowsClockwiseBold } from 'react-icons/pi'
import { toast } from 'sonner'
import { z } from 'zod'

// Zod validation schema
const adminSchema = z.object({
  name: z.string().min(2, 'Imię jest wymagane'),
  email: z.string().email('Niepoprawny adres e-mail'),
  phoneNumber: z.string().min(9, 'Numer telefonu jest wymagany'),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN'], {
    required_error: 'Rola jest wymagana',
  }),
  password: z
    .string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków')
    .max(32, 'Hasło nie może mieć więcej niż 32 znaki')
    .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
    .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
    .regex(/\d/, 'Hasło musi zawierać cyfrę')
    .regex(/[!@#$%^&*()_+{}[\]<>?]/, 'Hasło musi zawierać znak specjalny'),
})

type AdminFormData = z.infer<typeof adminSchema>

/**
 * AddAdminDialog component:
 * - Allows adding a new administrator with API integration (tRPC + Prisma).
 * - Provides full validation, role selection, and password generation.
 */
const AddAdminDialog = () => {
  const [open, setOpen] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)

  const utils = trpc.useUtils()

  // tRPC mutation to create a new admin
  const createUserMutation = trpc.user.createUser.useMutation({
    onSuccess: () => {
      toast.success('Administrator został dodany.')
      utils.user.getAdmins.invalidate() // Refresh user list after adding
      setOpen(false)
    },
    onError: () => toast.error('Błąd podczas dodawania administratora.'),
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
  })

  // Handles form submission with API integration
  const onSubmit = (data: AdminFormData) => {
    createUserMutation.mutate(data)
  }

  // Handles strong password generation
  const handleGeneratePassword = () => {
    const password = generateStrongPassword()
    setValue('password', password)
    setIsSpinning(true)
    setTimeout(() => {
      setIsSpinning(false)
    }, 500)
    toast.success('Wygenerowano silne hasło.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MdAdd /> Dodaj
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nowego administratora</DialogTitle>
          <DialogDescription>
            Wprowadź dane, aby dodać nowego administratora.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full name input */}
          <div>
            <Label htmlFor="name">Imię i nazwisko</Label>
            <Input
              id="name"
              placeholder="Imię i nazwisko"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-danger text-sm">{errors.name.message}</p>
            )}
          </div>

          {/* Email input */}
          <div>
            <Label htmlFor="email">Adres e-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="Adres e-mail"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-danger text-sm">{errors.email.message}</p>
            )}
          </div>

          {/* Phone number input */}
          <div>
            <Label htmlFor="phoneNumber">Numer telefonu</Label>
            <Input
              id="phoneNumber"
              placeholder="Numer telefonu"
              {...register('phoneNumber')}
            />
            {errors.phoneNumber && (
              <p className="text-danger text-sm">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Role selection */}
          <div>
            <Label htmlFor="role">Rola</Label>
            <Select
              onValueChange={(value) =>
                setValue(
                  'role',
                  value as
                    | 'ADMIN'
                    | 'TECHNICIAN'
                    | 'COORDINATOR'
                    | 'WAREHOUSEMAN'
                )
              }
              defaultValue="ADMIN"
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz rolę" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="ADMIN">Administrator</SelectItem>
                <SelectItem value="TECHNICIAN">Technik</SelectItem>
                <SelectItem value="COORDINATOR">Koordynator</SelectItem>
                <SelectItem value="WAREHOUSEMAN">Magazynier</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-danger text-sm">{errors.role.message}</p>
            )}
          </div>

          {/* Password input with generation button */}
          <div>
            <Label htmlFor="password">Hasło</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                placeholder="Hasło"
                {...register('password')}
              />
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
            {errors.password && (
              <p className="text-danger text-sm">{errors.password.message}</p>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || createUserMutation.isLoading}
          >
            {isSubmitting || createUserMutation.isLoading
              ? 'Dodawanie...'
              : 'Zapisz'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddAdminDialog
