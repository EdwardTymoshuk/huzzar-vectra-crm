import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import AdminsSection from '../components/settings/AdminsSection'

const SettingPage = () => {
  return (
    <MaxWidthWrapper>
      <PageHeader title="Ustawienia" />
      <AdminsSection />
    </MaxWidthWrapper>
  )
}

export default SettingPage
