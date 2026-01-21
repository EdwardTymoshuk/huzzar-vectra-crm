import SettingsSection from '@/app/components/settings/SettingsSection'
import MaterialDefinitionsList from './MaterialDefinitionsList'

/**
 * MaterialDefinitionsSection:
 * A settings section for managing material name definitions.
 */
const MaterialDefinitionsSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <MaterialDefinitionsList />
    </SettingsSection>
  )
}

export default MaterialDefinitionsSection
