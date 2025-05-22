'use client'

import ConfirmDeleteDialog from '@/app/components/shared/ConfirmDeleteDialog'
import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { Badge } from '@/app/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { generateStrongPassword } from '@/utils/passwordGenerator'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { Prisma } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { IoMdLock, IoMdUnlock } from 'react-icons/io'
import {
  MdEdit,
  MdOutlineDelete,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md'
import { PiArrowsClockwiseBold } from 'react-icons/pi'
import { toast } from 'sonner'
import { z } from 'zod'

/**
 * This type reflects the shape of user data returned by Prisma's findMany
 * with the given 'select'. It ensures no usage of 'any' for users.
 */
type AdminUser = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    phoneNumber: true
    name: true
    role: true
    status: true
  }
}>

/**
 * Validation schema for editing user data.
 * - Password is optional: if left empty, it won't be changed.
 * - Role is also optional: if omitted, it won't be changed.
 */
const adminEditSchema = z.object({
  name: z.string().min(2, 'Imię jest wymagane'),
  email: z.string().email('Niepoprawny adres e-mail'),
  phoneNumber: z.string().min(9, 'Numer telefonu jest wymagany'),
  password: z
    .string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków')
    .max(32, 'Hasło nie może mieć więcej niż 32 znaki')
    .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
    .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
    .regex(/\d/, 'Hasło musi zawierać cyfrę')
    .regex(/[!@#$%^&*()_+{}[\]<>?]/, 'Hasło musi zawierać znak specjalny')
    .optional(),
  role: z
    .enum(['ADMIN', 'TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN'])
    .optional(),
})

type AdminEditFormData = z.infer<typeof adminEditSchema>

/**
 * AdminsTable component:
 * - Displays a list of admins with actions: edit, block/unblock, and delete.
 * - Editing is done in a modal with pre-filled fields.
 * - The logged-in admin cannot block/delete themselves.
 * - We now include role selection in the edit form.
 */
const AdminsTable = () => {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setEditDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)

  const utils = trpc.useUtils()
  const { data: session } = useSession()

  // Fetch all admins (users)
  const { data: admins, isLoading, isError } = trpc.user.getAdmins.useQuery()

  // Toggle status mutation (ACTIVE <-> SUSPENDED)
  const toggleStatusMutation = trpc.user.toggleUserStatus.useMutation({
    onSuccess: () => {
      toast.success('Status użytkownika został zaktualizowany.')
      utils.user.getAdmins.invalidate()
    },
    onError: () => toast.error('Błąd podczas aktualizacji statusu.'),
  })

  // Delete mutation
  const deleteUserMutation = trpc.user.deleteUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został usunięty.')
      utils.user.getAdmins.invalidate()
      setDeleteDialogOpen(false)
    },
    onError: () => toast.error('Błąd podczas usuwania użytkownika.'),
  })

  // Edit user mutation
  const editUserMutation = trpc.user.editUser.useMutation({
    onSuccess: () => {
      toast.success('Dane użytkownika zostały zaktualizowane.')
      utils.user.getAdmins.invalidate()
      setEditDialogOpen(false)
    },
    onError: () => toast.error('Błąd podczas aktualizacji danych użytkownika.'),
  })

  // React Hook Form for editing user data
  const editForm = useForm<AdminEditFormData>({
    resolver: zodResolver(adminEditSchema),
  })

  /**
   * Handles the click on the edit button.
   * We set selectedUser and fill the form with existing data (password = '', etc.).
   */
  const handleEdit = (admin: AdminUser) => {
    setSelectedUser(admin)
    editForm.reset({
      name: admin.name,
      email: admin.email,
      phoneNumber: admin.phoneNumber,
      password: '', // Empty by default so we won't re-validate the hash
      role: admin.role, // Pre-fill with current role
    })
    setEditDialogOpen(true)
  }

  /**
   * Submits the form data to the server via the editUser mutation.
   */
  const onSubmitEdit = (data: AdminEditFormData) => {
    if (!selectedUser) return
    editUserMutation.mutate({ id: selectedUser.id, ...data })
  }

  /**
   * Generates a strong password and sets it in the form field.
   */
  const handleGeneratePassword = () => {
    const password = generateStrongPassword()
    editForm.setValue('password', password, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setIsSpinning(true)
    setTimeout(() => {
      setIsSpinning(false)
    }, 500)
    toast.success('Wygenerowano silne hasło.')
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  // Render error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>
          ⚠️ Nie udało się załadować administratorów. Spróbuj ponownie później.
        </AlertTitle>
      </Alert>
    )
  }

  return (
    <>
      {/* Table of admins */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imię i nazwisko</TableHead>
            <TableHead>Adres e-mail</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Rola</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins?.map((admin) => {
            const isCurrentUser = admin.id === session?.user.id
            return (
              <TableRow key={admin.id}>
                <TableCell>{admin.name}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>{admin.phoneNumber}</TableCell>
                <TableCell>
                  <Badge variant="outline">{admin.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      admin.status === 'ACTIVE' ? 'default' : 'destructive'
                    }
                  >
                    {admin.status === 'ACTIVE' ? 'Aktywny' : 'Zablokowany'}
                  </Badge>
                </TableCell>
                <TableCell className="flex gap-2">
                  {/* Edit user button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(admin)}
                  >
                    <MdEdit className="w-4 h-4" />
                  </Button>

                  {/* Block/Unblock button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isCurrentUser}
                    onClick={() =>
                      toggleStatusMutation.mutate({ id: admin.id })
                    }
                  >
                    {admin.status === 'ACTIVE' ? (
                      <IoMdLock className="w-4 h-4" />
                    ) : (
                      <IoMdUnlock className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Delete user button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isCurrentUser}
                    onClick={() => {
                      setSelectedUser(admin)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <MdOutlineDelete className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Edit User Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj dane administratora</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onSubmitEdit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię i nazwisko</FormLabel>
                    <FormControl>
                      <Input placeholder="Imię i nazwisko" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres e-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="Podaj adres e-mail" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numer telefonu</FormLabel>
                    <FormControl>
                      <Input placeholder="Podaj numer telefonu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Role selection (optional) */}
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rola</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value} // current value in form
                        defaultValue={field.value} // ensures the initial select is correct
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz rolę" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="ADMIN">Administrator</SelectItem>
                          <SelectItem value="TECHNICIAN">Technik</SelectItem>
                          <SelectItem value="COORDINATOR">
                            Koordynator
                          </SelectItem>
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
              {/* Password (optional) */}
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasło</FormLabel>
                    <div className="flex gap-2 relative">
                      <FormControl>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Wpisz nowe hasło lub zostaw puste"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
                      </Button>
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
              <Button
                type="submit"
                className="w-full"
                disabled={editForm.formState.isSubmitting}
              >
                {editForm.formState.isSubmitting
                  ? 'Zapisywanie...'
                  : 'Zapisz zmiany'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          if (!selectedUser) return
          deleteUserMutation.mutate({ id: selectedUser.id })
        }}
        description={`Czy na pewno chcesz  usunąć użytkownika ${selectedUser?.name}?`}
      />
    </>
  )
}

export default AdminsTable
