'use client'

import { useRole } from '@/utils/hooks/useRole'
import SettingsSection from '../../SettingsSection'
import AdminsTable from './AdminsTable'

/**
 * AdminsSection
 */
const AdminsSection = ({ title }: { title: string }) => {
  const { isAdmin } = useRole()

  return (
    <SettingsSection title={title}>
      <AdminsTable />
    </SettingsSection>
  )
}

export default AdminsSection
