import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import AdminsSection from '../components/settings/AdminsSection'
import DeviceDefinitionsSection from '../components/settings/DeviceDefinitionsSection'

const SettingPage = () => {
  return (
    <MaxWidthWrapper>
      <PageHeader title="Ustawienia" />
      <AdminsSection title="Administratorzy" />
      <DeviceDefinitionsSection title="Urządzenia" />
    </MaxWidthWrapper>
  )
}

export default SettingPage
