'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import { Badge } from '@/app/components/ui/badge'
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
import { EmployeeVM } from '@/server/modules/vectra-crm/helpers/mappers/mapVectraUserToEmployeeVM'
import { trpc } from '@/utils/trpc'
import { UserStatus } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { toast } from 'sonner'
import RowActionsDropdown from './RowActionsDropdown'
import SheetUserDetails from './SheetUserDetails'

type Props = {
  searchTerm: string
  status: UserStatus
}

const EmployeesTable = ({ searchTerm, status }: Props) => {
  const [selectedUser, setSelectedUser] = useState<EmployeeVM | null>(null)
  const [userToDelete, setUserToDelete] = useState<EmployeeVM | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.vectra.user.getTechnicians.useQuery({
    status,
  })

  const toggleStatusMutation = trpc.vectra.user.toggleUserStatus.useMutation({
    onSuccess: () => {
      toast.success('Status użytkownika został zmieniony.')
      utils.vectra.user.getTechnicians.invalidate()
    },
    onError: () => toast.error('Błąd przy zmianie statusu.'),
  })

  const deleteMutation = trpc.vectra.user.deleteUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został trwale usunięty.')
      utils.vectra.user.getTechnicians.invalidate()
    },
    onError: () => toast.error('Błąd podczas usuwania.'),
  })

  const archiveMutation = trpc.vectra.user.archiveUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został zarchiwizowany.')
      utils.vectra.user.getTechnicians.invalidate()
    },
    onError: () => toast.error('Błąd przy archiwizacji użytkownika.'),
  })

  const restoreMutation = trpc.vectra.user.restoreUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został przywrócony.')
      utils.vectra.user.getTechnicians.invalidate()
    },
    onError: () => toast.error('Błąd przy przywracaniu użytkownika.'),
  })

  const filtered = useMemo(() => {
    return (data || [])
      .filter((u) =>
        status === 'INACTIVE'
          ? u.status === 'INACTIVE'
          : u.status !== 'INACTIVE'
      )
      .filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.phoneNumber.includes(searchTerm)
      )
  }, [data, searchTerm, status])

  const handleShowDetails = (user: EmployeeVM) => setSelectedUser(user)

  const handleToggleStatus = (user: EmployeeVM) =>
    toggleStatusMutation.mutate({ id: user.id })

  const handleArchiveUser = (user: EmployeeVM) => {
    archiveMutation.mutate({ id: user.id })
  }

  const handleRestoreUser = (user: EmployeeVM) => {
    restoreMutation.mutate({ id: user.id })
  }

  const handleDelete = (user: EmployeeVM) => {
    setUserToDelete(user)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!userToDelete) return
    deleteMutation.mutate({ id: userToDelete.id })
    setConfirmDeleteOpen(false)
    setUserToDelete(null)
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
                    <RowActionsDropdown
                      user={user}
                      onShowDetails={handleShowDetails}
                      onToggleStatus={handleToggleStatus}
                      onArchive={handleArchiveUser}
                      onRestore={handleRestoreUser}
                      onDelete={handleDelete}
                    />
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

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmDelete}
        description={`Czy na pewno chcesz trwale usunąć użytkownika ${userToDelete?.name}?`}
      />
    </>
  )
}

export default EmployeesTable
