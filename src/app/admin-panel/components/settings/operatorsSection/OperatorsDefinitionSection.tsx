import SettingsSection from '../SettingsSection'
import AddOperatorDefinitionDialog from './AddOperatorDefinitionDialog'
import OperatorDefinitionsList from './OperatorDefinitionsList'

/**
 * DeviceDefinitionsSection:
 * A settings section for listing categories (DeviceCategory)
 * and subcategories (name).
 */
const OperatorsDefinitionSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <OperatorDefinitionsList />
      <div className="flex justify-end mt-4">
        <AddOperatorDefinitionDialog />
      </div>
    </SettingsSection>
  )
}

export default OperatorsDefinitionSection
