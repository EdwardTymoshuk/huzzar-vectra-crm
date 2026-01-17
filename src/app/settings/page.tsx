'use client'

import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import UnauthorizedPage from '@/app/components/UnauthorizedPage'
import PlatformLayout from '@/app/components/root/PlatformLayout'
import { SettingsContext } from '@/types'
import { useUser } from '@/utils/hooks/useUser'
import { useState } from 'react'
import { SettingsContent } from '../components/settings/SettingsContent'
import { SettingsSidebar } from '../components/settings/SettingsSidebar'

/**
 * SettingsPage
 * ------------------------------------------------------
 * Single settings entry point for all roles.
 * Layout and content are resolved based on user role.
 */
const SettingsPage = () => {
  const { user, role, modules, isLoading } = useUser()

  if (!user || !role) return <UnauthorizedPage />
  if (isLoading) return null

  const [section, setSection] = useState<SettingsContext>(
    role === 'TECHNICIAN' ? 'PROFILE' : 'CORE'
  )

  const moduleCodes = modules.map((m) => m.code)

  return (
    <PlatformLayout>
      <SettingsSidebar
        value={section}
        onChange={setSection}
        role={role}
        modules={moduleCodes}
      />

      <div className="flex-1 overflow-y-auto ml-64">
        <MaxWidthWrapper className="px-4 pt-0">
          <SettingsContent section={section} role={role} />
        </MaxWidthWrapper>
      </div>
    </PlatformLayout>
  )
}

export default SettingsPage
