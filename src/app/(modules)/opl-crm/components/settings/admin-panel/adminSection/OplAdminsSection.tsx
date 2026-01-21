'use client'

import SettingsSection from '@/app/components/settings/SettingsSection'
import { useRole } from '@/utils/hooks/useRole'
import AdminsTable from './OplAdminsTable'

/**
 * AdminsSection
 */
const OplAdminsSection = ({ title }: { title: string }) => {
  const { isAdmin } = useRole()

  return (
    <SettingsSection title={title}>
      <AdminsTable />
    </SettingsSection>
  )
}

export default OplAdminsSection
