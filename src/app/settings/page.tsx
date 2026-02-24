'use client'

import OplTechnicianSettingsContent from '@/app/(modules)/opl-crm/components/settings/technician/TechnicianSettingsContent'
import VectraTechnicianSettingsContent from '@/app/(modules)/vectra-crm/components/settings/technician/TechnicianSettingsContent'
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

  if (isLoading) return null
  if (!user || !role) return <UnauthorizedPage />

  const [section, setSection] = useState<SettingsContext>(
    role === 'TECHNICIAN' ? 'PROFILE' : 'CORE'
  )
  const isTechnician = role === 'TECHNICIAN'
  const moduleCodes = modules.map((m) => m.code)
  const hasOplModule = moduleCodes.includes('OPL')

  if (isTechnician) {
    return (
      <PlatformLayout>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-0">
            {hasOplModule ? (
              <OplTechnicianSettingsContent />
            ) : (
              <VectraTechnicianSettingsContent />
            )}
          </div>
        </div>
      </PlatformLayout>
    )
  }

  return (
    <PlatformLayout>
      <SettingsSidebar
        value={section}
        onChange={setSection}
        role={role}
        modules={moduleCodes}
      />

      <div className="ml-64 flex-1 overflow-y-auto">
        <MaxWidthWrapper className="px-4 pt-0">
          <SettingsContent section={section} role={role} />
        </MaxWidthWrapper>
      </div>
    </PlatformLayout>
  )
}

export default SettingsPage
