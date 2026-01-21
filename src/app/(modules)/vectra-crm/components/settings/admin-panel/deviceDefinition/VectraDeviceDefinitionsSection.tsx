import SettingsSection from '@/app/components/settings/SettingsSection'
import DeviceDefinitionsList from './DeviceDefinitionsList'

/**
 * DeviceDefinitionsSection:
 * A settings section for listing categories (VectraDeviceCategory)
 * and subcategories (name).
 */
const VectraDeviceDefinitionsSection= ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <DeviceDefinitionsList />
    </SettingsSection>
  )
}

export default VectraDeviceDefinitionsSection
