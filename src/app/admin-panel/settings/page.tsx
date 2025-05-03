import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import AdminsSection from '../components/settings/adminSection/AdminsSection'
import DeviceDefinitionsSection from '../components/settings/deviceDefinition/DeviceDefinitionsSection'
import MaterialDefinitionsSection from '../components/settings/materialDefinition/MaterialDefinitionsSection'
import OperatorsDefinitionSection from '../components/settings/operatorsSection/OperatorsDefinitionSection'
import RatesSection from '../components/settings/rateSection/RatesSection'

const SettingPage = () => {
  return (
    <MaxWidthWrapper>
      <PageHeader title="Ustawienia" />
      <AdminsSection title="Administratorzy" />
      <DeviceDefinitionsSection title="Urządzenia" />
      <MaterialDefinitionsSection title="Materiał" />
      <OperatorsDefinitionSection title="Operatorzy" />
      <RatesSection title="Stawki" />
    </MaxWidthWrapper>
  )
}

export default SettingPage
