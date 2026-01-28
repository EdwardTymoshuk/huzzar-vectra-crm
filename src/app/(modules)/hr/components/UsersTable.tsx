'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import { Badge } from '@/app/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { NormalizedUser } from '@/server/core/helpers/users/normalizeUser'
import { trpc } from '@/utils/trpc'
import type { UserStatus } from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'
import EditUserDialog from './EditUserDialog'
import HrUserActionsDropdown from './HrUserActionsDropdown'

interface Props {
  users: NormalizedUser[]
}

/**
 * UsersTable (HR)
 * ------------------------------------------------------
 * Central HR table for managing system users.
 * This is the ONLY place where user lifecycle actions are allowed.
 */
export default function UsersTable({ users }: Props) {
  const [userToDelete, setUserToDelete] = useState<NormalizedUser | null>(null)
  const [userToEdit, setUserToEdit] = useState<NormalizedUser | null>(null)

  const utils = trpc.useUtils()

  const updateStatus = trpc.hr.user.updateUserStatus.useMutation({
    onSuccess: () => {
      toast.success('Status użytkownika został zmieniony.')
      utils.hr.user.getUsers.invalidate()
    },
  })

  const archiveUser = trpc.hr.user.archiveUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został zarchiwizowany.')
      utils.hr.user.getUsers.invalidate()
    },
  })

  const restoreUser = trpc.hr.user.restoreUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został przywrócony.')
      utils.hr.user.getUsers.invalidate()
    },
  })

  const deleteUser = trpc.hr.user.deleteUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został usunięty.')
      utils.hr.user.getUsers.invalidate()
    },
  })

  const handleToggleStatus = (userId: string, status: UserStatus) => {
    updateStatus.mutate({
      userId,
      status: status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Rola</TableHead>
            <TableHead>Moduły</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                Brak użytkowników
              </TableCell>
            </TableRow>
          )}

          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>

              <TableCell>{user.role}</TableCell>

              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.modules.map((m) => (
                    <Badge key={m.id} variant="secondary">
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>

              <TableCell>
                <Badge
                  variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}
                >
                  {user.status}
                </Badge>
              </TableCell>

              <TableCell className="text-right">
                <HrUserActionsDropdown
                  userId={user.id}
                  status={user.status}
                  onEdit={() => setUserToEdit(user)}
                  onToggleStatus={() =>
                    handleToggleStatus(user.id, user.status)
                  }
                  onArchive={() => archiveUser.mutate({ userId: user.id })}
                  onRestore={() => restoreUser.mutate({ id: user.id })}
                  onDelete={() => setUserToDelete(user)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDeleteDialog
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (!userToDelete) return
          deleteUser.mutate({ id: userToDelete.id })
          setUserToDelete(null)
        }}
        description={`Czy na pewno chcesz trwale usunąć użytkownika ${userToDelete?.email}?`}
      />

      {userToEdit && (
        <EditUserDialog user={userToEdit} onClose={() => setUserToEdit(null)} />
      )}
    </>
  )
}
