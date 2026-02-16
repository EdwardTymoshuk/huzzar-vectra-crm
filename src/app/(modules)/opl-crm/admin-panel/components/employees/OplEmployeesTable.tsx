'use client'

import EditUserDialog from '@/app/(modules)/hr/components/EditUserDialog'
import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import SheetUserDetails from '@/app/components/SheetUserDetails'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import {
  userRoleMap,
  userStatusColorMap,
  userStatusNameMap,
} from '@/lib/constants'
import { NormalizedUser } from '@/server/core/helpers/users/normalizeUser'
import { EmployeeVM } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { UserStatus } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { FaLock, FaLockOpen } from 'react-icons/fa6'
import {
  MdDelete,
  MdEdit,
  MdMoreVert,
  MdRestore,
  MdVisibility,
} from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  searchTerm: string
  status: UserStatus
}

const OplEmployeesTable = ({ searchTerm, status }: Props) => {
  const [selectedUser, setSelectedUser] = useState<EmployeeVM | null>(null)
  const [editingUser, setEditingUser] = useState<NormalizedUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<EmployeeVM | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const { isAdmin } = useRole()
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.opl.user.getTechnicians.useQuery({
    status,
  })
  const { data: hrUsers } = trpc.hr.user.getUsers.useQuery(undefined, {
    enabled: isAdmin,
  })

  const refreshLists = async () => {
    await Promise.all([
      utils.opl.user.getTechnicians.invalidate({ status: 'ACTIVE' }),
      utils.opl.user.getTechnicians.invalidate({ status: 'SUSPENDED' }),
      utils.opl.user.getTechnicians.invalidate({ status: 'INACTIVE' }),
      utils.hr.user.getUsers.invalidate(),
    ])
  }

  const updateUserStatus = trpc.hr.user.updateUserStatus.useMutation({
    onSuccess: async () => {
      toast.success('Status użytkownika został zmieniony.')
      await refreshLists()
    },
    onError: () => {
      toast.error('Nie udało się zmienić statusu użytkownika.')
    },
  })
  const archiveUser = trpc.hr.user.archiveUser.useMutation({
    onSuccess: async () => {
      toast.success('Użytkownik został zarchiwizowany.')
      await refreshLists()
    },
    onError: () => toast.error('Błąd przy archiwizacji użytkownika.'),
  })
  const restoreUser = trpc.hr.user.restoreUser.useMutation({
    onSuccess: async () => {
      toast.success('Użytkownik został przywrócony.')
      await refreshLists()
    },
    onError: () => toast.error('Błąd przy przywracaniu użytkownika.'),
  })
  const deleteUser = trpc.hr.user.deleteUser.useMutation({
    onSuccess: async () => {
      toast.success('Użytkownik został trwale usunięty.')
      await refreshLists()
    },
    onError: () => toast.error('Błąd podczas usuwania.'),
  })

  const filtered = useMemo(() => {
    return (data || [])
      .filter((u) =>
        status === 'ACTIVE'
          ? u.status === 'ACTIVE'
          : status === 'INACTIVE'
            ? u.status === 'INACTIVE'
            : status === 'SUSPENDED'
              ? u.status === 'SUSPENDED'
              : u.status === status
      )
      .filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.phoneNumber.includes(searchTerm)
      )
  }, [data, searchTerm, status])

  const handleShowDetails = (user: EmployeeVM) => setSelectedUser(user)
  const handleEdit = (user: EmployeeVM) => {
    if (!isAdmin) return
    const fullUser = hrUsers?.find((u) => u.id === user.id)
    if (!fullUser) {
      toast.error('Nie udało się pobrać pełnych danych użytkownika.')
      return
    }
    setEditingUser(fullUser)
  }
  const handleToggleStatus = (user: EmployeeVM) => {
    updateUserStatus.mutate({
      userId: user.id,
      status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    })
  }
  const handleArchive = (user: EmployeeVM) => {
    archiveUser.mutate({ userId: user.id })
  }
  const handleRestore = (user: EmployeeVM) => {
    restoreUser.mutate({ id: user.id })
  }
  const handleDelete = (user: EmployeeVM) => {
    setUserToDelete(user)
    setConfirmDeleteOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Brak użytkowników do wyświetlenia.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Highlight
                      searchWords={[searchTerm]}
                      textToHighlight={user.name}
                      autoEscape
                      highlightClassName="bg-yellow-200"
                    />
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phoneNumber}</TableCell>
                  <TableCell>{userRoleMap[user.role]}</TableCell>
                  <TableCell>
                    <Badge className={userStatusColorMap[user.status]}>
                      {userStatusNameMap[user.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Akcje">
                          <MdMoreVert />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="bg-background text-foreground border border-border shadow-md"
                        align="end"
                      >
                        <DropdownMenuItem onClick={() => handleShowDetails(user)}>
                          <MdVisibility className="mr-2 h-4 w-4" />
                          Szczegóły
                        </DropdownMenuItem>

                        {user.status !== 'INACTIVE' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleEdit(user)}
                              disabled={!isAdmin}
                            >
                              <MdEdit className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(user)}
                              disabled={!isAdmin || updateUserStatus.isPending}
                            >
                              {user.status === 'ACTIVE' ? (
                                <>
                                  <FaLock className="mr-2 h-4 w-4" />
                                  Zablokuj
                                </>
                              ) : (
                                <>
                                  <FaLockOpen className="mr-2 h-4 w-4" />
                                  Odblokuj
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleArchive(user)}
                              disabled={!isAdmin || archiveUser.isPending}
                            >
                              <MdDelete className="mr-2 h-4 w-4" />
                              Archiwizuj
                            </DropdownMenuItem>
                          </>
                        )}

                        {user.status === 'INACTIVE' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleRestore(user)}
                              disabled={!isAdmin || restoreUser.isPending}
                            >
                              <MdRestore className="mr-2 h-4 w-4" />
                              Przywróć
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(user)}
                              disabled={!isAdmin || deleteUser.isPending}
                              className="text-destructive"
                            >
                              <MdDelete className="mr-2 h-4 w-4" />
                              Usuń na stałe
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <SheetUserDetails
          user={selectedUser}
          open
          onClose={() => setSelectedUser(null)}
        />
      )}

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false)
          setUserToDelete(null)
        }}
        onConfirm={() => {
          if (!userToDelete) return
          deleteUser.mutate({ id: userToDelete.id })
          setConfirmDeleteOpen(false)
          setUserToDelete(null)
        }}
        description={`Czy na pewno chcesz trwale usunąć użytkownika ${userToDelete?.name}?`}
      />
    </>
  )
}

export default OplEmployeesTable
