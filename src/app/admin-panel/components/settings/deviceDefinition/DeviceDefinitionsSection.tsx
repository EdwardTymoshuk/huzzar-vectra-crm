import SettingsSection from '../SettingsSection'
import AddDeviceDefinitionDialog from './AddDeviceDefinitionDialog'
import DeviceDefinitionsList from './DeviceDefinitionsList'

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
