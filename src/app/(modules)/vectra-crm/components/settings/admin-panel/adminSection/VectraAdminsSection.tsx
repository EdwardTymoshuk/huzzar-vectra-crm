'use client'

import SettingsSection from '@/app/components/settings/SettingsSection'
import { useRole } from '@/utils/hooks/useRole'
import VectraAdminsTable from './VectraAdminsTable'

/**
 * AdminsSection
 */
const VectraAdminsSection = ({ title }: { title: string }) => {
  const { isAdmin } = useRole()

  return (
    <SettingsSection title={title}>
      <VectraAdminsTable />
    </SettingsSection>
  )
}

export default VectraAdminsSection
