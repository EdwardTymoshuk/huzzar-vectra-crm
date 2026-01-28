import SettingsSection from '@/app/components/settings/SettingsSection'
import AddRateDefinitionDialog from './AddRateDefinitionDialog'
import RatesTable from './RatesTable'

/**
 * OplRatesSection component:
 * - A settings section showing a list of rates (kod + stawka)
 * - Contains a button/dialog for adding new rates
 */
const OplRatesSection = ({ title }: { title: string }) => {
  return (
    <SettingsSection title={title}>
      <RatesTable />
      <div className="flex justify-end mt-4">
        <AddRateDefinitionDialog />
      </div>
    </SettingsSection>
  )
}

export default OplRatesSection
