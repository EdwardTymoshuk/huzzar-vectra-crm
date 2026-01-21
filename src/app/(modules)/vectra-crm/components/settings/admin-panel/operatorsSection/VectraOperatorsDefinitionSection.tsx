import SettingsSection from '@/app/components/settings/SettingsSection'
import AddOperatorDefinitionDialog from './AddOperatorDefinitionDialog'
import OperatorDefinitionsList from './OperatorDefinitionsList'

/**
 * DeviceDefinitionsSection:
 * A settings section for listing categories (VectraDeviceCategory)
 * and subcategories (name).
 */
const VectraOperatorsDefinitionSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <OperatorDefinitionsList />
      <div className="flex justify-end mt-4">
        <AddOperatorDefinitionDialog />
      </div>
    </SettingsSection>
  )
}

export default VectraOperatorsDefinitionSection
