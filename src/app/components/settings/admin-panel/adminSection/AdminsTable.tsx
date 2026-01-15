'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { AdminUserVM } from '@/server/core/helpers/mappers/mapAdminToVM'
import { trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { IoMdLock, IoMdUnlock } from 'react-icons/io'
import { MdDelete, MdEdit } from 'react-icons/md'
import { toast } from 'sonner'
import { userRoleMap } from '../../../../../lib/constants'
import AdminEditDialog from './AdminEditDialog'

const AdminsTable = () => {
  const [editingUser, setEditingUser] = useState<AdminUserVM | null>(null)
  const [userToDelete, setUserToDelete] = useState<AdminUserVM | null>(null)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const utils = trpc.useUtils()
  const { data: session } = useSession()

  const {
    data: admins,
    isLoading,
    isError,
  } = trpc.vectra.user.getAdmins.useQuery()

  const toggleStatusMutation = trpc.vectra.user.toggleUserStatus.useMutation({
    onSuccess: () => {
      toast.success('Status użytkownika został zaktualizowany.')
      utils.vectra.user.getAdmins.invalidate()
    },
    onError: () => toast.error('Błąd podczas aktualizacji statusu.'),
  })

  const deleteUserMutation = trpc.vectra.user.deleteUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został usunięty.')
      utils.vectra.user.getAdmins.invalidate()
      setDeleteDialogOpen(false)
    },
    onError: () => toast.error('Błąd podczas usuwania użytkownika.'),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

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
                  <Badge variant="outline">{userRoleMap[admin.role]}</Badge>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUser(admin)}
                  >
                    <MdEdit className="w-4 h-4" />
                  </Button>
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
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isCurrentUser}
                    onClick={() => {
                      setUserToDelete(admin)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <MdDelete className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {editingUser && (
        <AdminEditDialog
          admin={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          if (!userToDelete) return
          deleteUserMutation.mutate({ id: userToDelete.id })
        }}
        description={`Czy na pewno chcesz usunąć użytkownika ${userToDelete?.name}?`}
      />
    </>
  )
}

export default AdminsTable
