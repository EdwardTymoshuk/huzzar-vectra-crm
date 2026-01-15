'use client'

import AddUserDialog from '@/app/(modules)/vectra-crm/admin-panel/components/users/AddUserDialog'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import SettingsSection from '../../SettingsSection'
import AdminsTable from './AdminsTable'

/**
 * AdminsSection:
 * - Zawiera listę administratorów i przycisk do dodania nowego.
 * - Otwiera AddUserDialog z domyślną rolą ADMIN.
 */
const AdminsSection = ({ title }: { title: string }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { isAdmin } = useRole()

  return (
    <SettingsSection title={title}>
      <AdminsTable />

      {isAdmin && (
        <div className="flex justify-end mt-4">
          <Button onClick={() => setIsDialogOpen(true)}>
            <MdAdd /> Dodaj użytkownika
          </Button>
        </div>
      )}

      {isAdmin && (
        <AddUserDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          defaultRole="COORDINATOR"
        />
      )}
    </SettingsSection>
  )
}

export default AdminsSection
