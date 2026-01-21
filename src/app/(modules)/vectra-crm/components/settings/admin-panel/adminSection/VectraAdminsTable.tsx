'use client'

import { Alert, AlertTitle } from '@/app/components/ui/alert'
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
import { userRoleMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'

const VectraAdminsTable = () => {
  const {
    data: admins,
    isLoading,
    isError,
  } = trpc.vectra.user.getAdmins.useQuery()

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
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}

export default VectraAdminsTable
