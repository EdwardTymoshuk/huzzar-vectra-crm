'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { trpc } from '@/utils/trpc'
import { toast } from 'sonner'

import ChangePasswordDialog from '../components/settings/ChangePasswordDialog'
import GoalsCard from '../components/settings/GoalsCard'
import ProfileCard from '../components/settings/ProfileCard'

const SettingsPage = () => {
  // Extract current user's role from session for role-based access control
  const { data: session } = useSession()
  const user = session?.user

  /* ---------- goals ---------- */
  const goalsQuery = trpc.user.getGoals.useQuery()
  const goalsMutation = trpc.user.saveGoals.useMutation({
    onSuccess: () => {
      toast.success('Cele zapisane')
      goalsQuery.refetch()
    },
  })

  /* ---------- password ---------- */
  const [showDialog, setShowDialog] = useState(false)

  const passMutation = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Hasło zostało zmienione.')
      setShowDialog(false)
    },
    onError: ({ message }) => {
      toast.error(message || 'Nie udało się zmienić hasła.')
    },
  })

  return (
    <MaxWidthWrapper>
      <PageHeader title="Ustawienia" />

      <div className="flex flex-col space-y-6">
        <ProfileCard
          user={user ?? {}}
          onChangePass={() => setShowDialog(true)}
        />

        <GoalsCard
          initialDays={goalsQuery.data?.workingDaysGoal}
          initialRevenue={goalsQuery.data?.revenueGoal}
          onSave={(days, income) =>
            goalsMutation.mutateAsync({ workDays: days, incomeGoal: income })
          }
        />
      </div>

      <ChangePasswordDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSubmit={(oldPwd, newPwd) =>
          passMutation.mutate({ oldPassword: oldPwd, newPassword: newPwd })
        }
        loading={passMutation.isLoading}
      />
    </MaxWidthWrapper>
  )
}

export default SettingsPage
