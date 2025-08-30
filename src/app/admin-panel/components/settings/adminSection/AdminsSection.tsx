'use client'

import AddUserDialog from '@/app/components/shared/users/AddUserDialog'
import { Button } from '@/app/components/ui/button'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'
import SettingsSection from '../SettingsSection'
import AdminsTable from './AdminsTable'

/**
 * AdminsSection:
 * - Zawiera listę administratorów i przycisk do dodania nowego.
 * - Otwiera AddUserDialog z domyślną rolą ADMIN.
 */
const AdminsSection = ({ title }: { title: string }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <SettingsSection title={title}>
      <AdminsTable />
      <div className="flex justify-end mt-4">
        <Button variant="success" onClick={() => setIsDialogOpen(true)}>
          <MdAdd /> Dodaj administratora
        </Button>
      </div>

      <AddUserDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        defaultRole="COORDINATOR"
      />
    </SettingsSection>
  )
}

export default AdminsSection
