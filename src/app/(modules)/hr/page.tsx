//scr/app/(modules)/hr/page.tsx
'use client'

import { trpc } from '@/utils/trpc'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import CreateUserDialog from './components/CreateUserDialog'
import UsersTable from './components/UsersTable'

export default function HrPage() {
  const { data, isLoading } = trpc.hr.user.getUsers.useQuery()

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoaderSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Dział HR</h1>
          <p className="text-sm text-muted-foreground">
            Zarządzanie użytkownikami, rolami i modułami
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <UsersTable users={data ?? []} />
    </div>
  )
}
