'use client'

import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'
import ChangePasswordDialog from '../components/settings/ChangePasswordDialog'
import GoalsCard from '../components/settings/GoalsCard'
import ProfileCard from '../components/settings/ProfileCard'

const SettingsPage = () => {
  const { data: session } = useSession()
  const user = session?.user

  /* goals */
  const goalsQuery = trpc.user.getGoals.useQuery()
  const goalsMutation = trpc.user.saveGoals.useMutation({
    onSuccess: () => {
      toast.success('Cele zapisane')
      goalsQuery.refetch()
    },
  })

  /* password */
  const [showDialog, setShowDialog] = useState(false)
  const passMutation = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Hasło zostało zmienione.')
      setShowDialog(false)
    },
    onError: (error) => {
      const msg =
        (error.data as any)?.message ||
        (error as any)?.message ||
        'Nie udało się zmienić hasła.'

      toast.error(msg)
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
          onSave={(d, r) =>
            goalsMutation.mutateAsync({ workDays: d, incomeGoal: r })
          }
        />
      </div>

      <ChangePasswordDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSubmit={(o, n) =>
          passMutation.mutate({ oldPassword: o, newPassword: n })
        }
        loading={passMutation.isLoading}
      />
    </MaxWidthWrapper>
  )
}
export default SettingsPage
