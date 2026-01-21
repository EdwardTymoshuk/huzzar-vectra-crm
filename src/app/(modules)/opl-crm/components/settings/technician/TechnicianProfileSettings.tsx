'use client'

import GoalsCard from '@/app/components/settings/GoalsCard'
import ProfileCard from '@/app/components/settings/ProfileCard'
import { trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'
import ChangePasswordDialog from '../../../../../components/settings/ChangePasswordDialog'

const TechnicianProfileSettings = () => {
  const { data: session } = useSession()
  const user = session?.user

  const goalsQuery = trpc.core.user.getGoals.useQuery()
  const goalsMutation = trpc.core.user.saveGoals.useMutation({
    onSuccess: () => {
      toast.success('Cele zapisane')
      goalsQuery.refetch()
    },
  })

  const [showDialog, setShowDialog] = useState(false)

  const passMutation = trpc.core.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Hasło zostało zmienione.')
      setShowDialog(false)
    },
  })

  return (
    <>
      <div className="mt-6 space-y-6">
        <ProfileCard
          user={user ?? {}}
          onChangePass={() => setShowDialog(true)}
        />

        <GoalsCard
          initialDays={goalsQuery.data?.workingDaysGoal}
          initialRevenue={goalsQuery.data?.revenueGoal}
          onSave={(days, income) =>
            goalsMutation.mutateAsync({
              workDays: days,
              incomeGoal: income,
            })
          }
        />
      </div>

      <ChangePasswordDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSubmit={(oldPwd, newPwd) =>
          passMutation.mutate({
            oldPassword: oldPwd,
            newPassword: newPwd,
          })
        }
        loading={passMutation.isLoading}
      />
    </>
  )
}

export default TechnicianProfileSettings
