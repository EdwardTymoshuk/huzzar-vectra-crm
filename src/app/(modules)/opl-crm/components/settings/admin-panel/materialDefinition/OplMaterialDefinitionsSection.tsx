import SettingsSection from '@/app/components/settings/SettingsSection'
import MaterialDefinitionsList from './MaterialDefinitionsList'

/**
 * OplMaterialDefinitionsSection:
 * A settings section for managing material name definitions.
 */
const OplMaterialDefinitionsSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <MaterialDefinitionsList />
    </SettingsSection>
  )
}

export default OplMaterialDefinitionsSection
