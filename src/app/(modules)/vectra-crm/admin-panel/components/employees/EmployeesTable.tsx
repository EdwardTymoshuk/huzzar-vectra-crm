'use client'

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
import {
  userRoleMap,
  userStatusColorMap,
  userStatusNameMap,
} from '@/lib/constants'
import { EmployeeVM } from '@/types'
import { trpc } from '@/utils/trpc'
import { UserStatus } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdVisibility } from 'react-icons/md'
import SheetUserDetails from './SheetUserDetails'

type Props = {
  searchTerm: string
  status: UserStatus
}

const EmployeesTable = ({ searchTerm, status }: Props) => {
  const [selectedUser, setSelectedUser] = useState<EmployeeVM | null>(null)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.vectra.user.getTechnicians.useQuery({
    status,
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShowDetails(user)}
                    >
                      <MdVisibility className="h-4 w-4" />
                    </Button>
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
    </>
  )
}

export default EmployeesTable
