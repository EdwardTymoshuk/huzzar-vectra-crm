import AddAdminDialog from './AddAdminDialog'
import AdminsTable from './AdminsTable'
import SettingsSection from './SettingsSection'

const AdminsSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <AdminsTable />
      <div className="flex justify-end mt-4">
        <AddAdminDialog />
      </div>
    </SettingsSection>
  )
}

export default AdminsSection
