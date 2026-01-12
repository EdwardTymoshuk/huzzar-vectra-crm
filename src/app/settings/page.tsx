import { useSession } from 'next-auth/react'
import { useState } from 'react'
import MaxWidthWrapper from '../components/MaxWidthWrapper'
import UnauthorizedPage from '../components/UnauthorizedPage'
import { SettingsContent } from '../components/root/settings/SettingsContent'
import { SettingsSidebar } from '../components/root/settings/SettingsSidebar'
import { Skeleton } from '../components/ui/skeleton'

const SettingsPage = () => {
  const { data: session } = useSession()
  const role = session?.user.role

  const [section, setSection] = useState<'CORE' | 'VECTRA' | 'OPL' | 'FLEET'>(
    'CORE'
  )

  if (role === 'WAREHOUSEMAN') return <UnauthorizedPage />

  if (status === 'loading') {
    // Skeleton placeholder while session is being loaded
    return (
      <MaxWidthWrapper>
        <div className="space-y-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </MaxWidthWrapper>
    )
  }

  return (
    <div className="flex gap-6">
      <SettingsSidebar value={section} onChange={setSection} />

      <SettingsContent section={section} role={role} />
    </div>
  )
}

export default SettingsPage
