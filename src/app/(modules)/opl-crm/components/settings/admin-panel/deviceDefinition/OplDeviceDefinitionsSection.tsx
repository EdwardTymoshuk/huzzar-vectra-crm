import SettingsSection from '@/app/components/settings/SettingsSection'
import DeviceDefinitionsList from './DeviceDefinitionsList'

/**
 * OplDeviceDefinitionsSection:
 * A settings section for listing categories (OplDeviceCategory)
 * and subcategories (name).
 */
const OplDeviceDefinitionsSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <DeviceDefinitionsList />
    </SettingsSection>
  )
}

export default OplDeviceDefinitionsSection
