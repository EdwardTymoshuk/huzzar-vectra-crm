import AddMaterialDefinitionDialog from './AddMaterialDefinitionDialog'
import MaterialDefinitionsList from './MaterialDefinitionsList'
import SettingsSection from './SettingsSection'

/**
 * MaterialDefinitionsSection:
 * A settings section for managing material name definitions.
 */
const MaterialDefinitionsSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <MaterialDefinitionsList />
      <div className="flex justify-end mt-4">
        <AddMaterialDefinitionDialog />
      </div>
    </SettingsSection>
  )
}

export default MaterialDefinitionsSection
