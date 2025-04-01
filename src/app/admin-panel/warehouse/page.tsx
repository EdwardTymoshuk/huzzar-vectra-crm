import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import WarehouseTabs from '../components/warehouse/WarehouseTabs'
import WarehouseToolbar from '../components/warehouse/WarehouseToolbar'

const WarehousePage = () => {
  return (
    <MaxWidthWrapper>
      <PageHeader title="Magazyn" />
      <div className="space-y-6">
        <WarehouseToolbar />
        <WarehouseTabs />
      </div>
    </MaxWidthWrapper>
  )
}

export default WarehousePage
