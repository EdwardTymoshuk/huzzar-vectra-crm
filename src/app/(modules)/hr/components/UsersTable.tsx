'use client'

import { Badge } from '@/app/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import type { User } from '@prisma/client'
import EditUserDialog from './EditUserDialog'

type UserRow = User & {
  modules: {
    module: {
      id: string
      name: string
      code: string
    }
  }[]
  locations: {
    id: string
    name: string
  }[]
}

interface Props {
  users: UserRow[]
}

/**
 * UsersTable (Kadry)
 * ------------------------------------------------------------------
 * Displays system users with assigned roles, modules and status.
 * Provides edit action per user.
 */
export default function UsersTable({ users }: Props) {
  return (
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
                  <Badge key={m.module.id} variant="secondary">
                    {m.module.name}
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
              <EditUserDialog
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  phoneNumber: user.phoneNumber,
                  identyficator: user.identyficator,
                  role: user.role,
                  status: user.status,
                  modules: user.modules,
                  locations: user.locations,
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
