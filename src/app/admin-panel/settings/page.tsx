import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import AdminsSection from '../components/settings/AdminsSection'
import DeviceDefinitionsSection from '../components/settings/DeviceDefinitionsSection'
import MaterialDefinitionsSection from '../components/settings/MaterialDefinitionsSection'
import RatesSection from '../components/settings/RatesSection'

const SettingPage = () => {
  return (
    <MaxWidthWrapper>
      <PageHeader title="Ustawienia" />
      <AdminsSection title="Administratorzy" />
      <DeviceDefinitionsSection title="Urządzenia" />
      <MaterialDefinitionsSection title="Materiał" />
      <RatesSection title="Stawki" />
    </MaxWidthWrapper>
  )
}

export default SettingPage
