//scr/app/(modules)/hr/page.tsx
'use client'

import { trpc } from '@/utils/trpc'
import CreateUserDialog from './components/CreateUserDialog'
import UsersTable from './components/UsersTable'

export default function HrPage() {
  const { data, isLoading } = trpc.hr.user.getUsers.useQuery()

  if (isLoading) return null

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Kadry</h1>
        <CreateUserDialog />
      </div>

      <UsersTable users={data ?? []} />
    </div>
  )
}
