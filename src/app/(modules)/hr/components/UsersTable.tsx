'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { userRoleMap, userStatusColorMap, userStatusNameMap } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { NormalizedUser } from '@/server/core/helpers/users/normalizeUser'
import { trpc } from '@/utils/trpc'
import type { UserStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
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
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [userToDelete, setUserToDelete] = useState<NormalizedUser | null>(null)
  const [userToEdit, setUserToEdit] = useState<NormalizedUser | null>(null)
  const [search, setSearch] = useState('')

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

  const applySearch = (list: NormalizedUser[]) => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((u) => {
      const modules = u.modules.map((m) => m.code).join(' ').toLowerCase()
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        modules.includes(q)
      )
    })
  }

  const isPurgedUser = (user: NormalizedUser) =>
    user.email.startsWith('purged-') && user.email.endsWith('@example.invalid')

  const visibleUsers = useMemo(
    () => users.filter((u) => u.status !== 'DELETED'),
    [users]
  )

  const allUsers = useMemo(() => applySearch(visibleUsers), [visibleUsers, search])
  const vectraUsers = useMemo(
    () =>
      applySearch(visibleUsers.filter((u) => u.modules.some((m) => m.code === 'VECTRA'))),
    [visibleUsers, search]
  )
  const oplUsers = useMemo(
    () => applySearch(visibleUsers.filter((u) => u.modules.some((m) => m.code === 'OPL'))),
    [visibleUsers, search]
  )
  const adminUsers = useMemo(
    () => applySearch(visibleUsers.filter((u) => u.role !== 'TECHNICIAN')),
    [visibleUsers, search]
  )
  const blockedUsers = useMemo(
    () => applySearch(visibleUsers.filter((u) => u.status === 'SUSPENDED')),
    [visibleUsers, search]
  )
  const archivedUsers = useMemo(
    () =>
      applySearch(
        users.filter((u) => u.status === 'DELETED' && !isPurgedUser(u))
      ),
    [users, search]
  )

  const renderRows = (list: NormalizedUser[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pracownik</TableHead>
          <TableHead>Rola</TableHead>
          <TableHead>Moduły</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Akcje</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Brak użytkowników
            </TableCell>
          </TableRow>
        )}

        {list.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </TableCell>

            <TableCell>{userRoleMap[user.role] ?? user.role}</TableCell>

            <TableCell>
              <div className="flex flex-wrap gap-1">
                {user.modules.map((m) => (
                  <Badge key={m.id} variant="secondary">
                    {m.code}
                  </Badge>
                ))}
              </div>
            </TableCell>

            <TableCell>
              <Badge className={cn(userStatusColorMap[user.status])}>
                {userStatusNameMap[user.status] ?? user.status}
              </Badge>
            </TableCell>

            <TableCell className="text-right">
              <HrUserActionsDropdown
                userId={user.id}
                status={user.status}
                canArchiveDelete={isAdmin}
                onEdit={() => setUserToEdit(user)}
                onToggleStatus={() => handleToggleStatus(user.id, user.status)}
                onArchive={() => archiveUser.mutate({ userId: user.id })}
                onRestore={() => restoreUser.mutate({ id: user.id })}
                onDelete={() => setUserToDelete(user)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <>
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Zarządzanie personelem</p>
            <h2 className="text-lg font-semibold">Pracownicy i uprawnienia</h2>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po imieniu, emailu lub module"
            className="md:max-w-sm"
          />
        </div>

        <Tabs defaultValue="all" className="space-y-3">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-6">
            <TabsTrigger value="all">Wszystkie ({allUsers.length})</TabsTrigger>
            <TabsTrigger value="vectra">VECTRA ({vectraUsers.length})</TabsTrigger>
            <TabsTrigger value="opl">OPL ({oplUsers.length})</TabsTrigger>
            <TabsTrigger value="admins">
              Administratorzy ({adminUsers.length})
            </TabsTrigger>
            <TabsTrigger value="blocked">
              Zablokowani ({blockedUsers.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Zarchiwizowani ({archivedUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">{renderRows(allUsers)}</TabsContent>
          <TabsContent value="vectra">{renderRows(vectraUsers)}</TabsContent>
          <TabsContent value="opl">{renderRows(oplUsers)}</TabsContent>
          <TabsContent value="admins">{renderRows(adminUsers)}</TabsContent>
          <TabsContent value="blocked">{renderRows(blockedUsers)}</TabsContent>
          <TabsContent value="archived">{renderRows(archivedUsers)}</TabsContent>
        </Tabs>
      </div>

      <ConfirmDeleteDialog
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (!userToDelete) return
          deleteUser.mutate({ id: userToDelete.id, force: true })
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
