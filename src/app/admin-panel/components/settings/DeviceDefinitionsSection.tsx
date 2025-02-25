import AddDeviceDefinitionDialog from './AddDeviceDefinitionDialog'
import DeviceDefinitionsList from './DeviceDefinitionsList'
import SettingsSection from './SettingsSection'

/**
 * DeviceDefinitionsSection:
 * A settings section for listing categories (DeviceCategory)
 * and subcategories (name).
 */
const DeviceDefinitionsSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <DeviceDefinitionsList />
      <div className="flex justify-end mt-4">
        <AddDeviceDefinitionDialog />
      </div>
    </SettingsSection>
  )
}

export default DeviceDefinitionsSection
