import SettingsSection from '../SettingsSection'
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
    </SettingsSection>
  )
}

export default DeviceDefinitionsSection
