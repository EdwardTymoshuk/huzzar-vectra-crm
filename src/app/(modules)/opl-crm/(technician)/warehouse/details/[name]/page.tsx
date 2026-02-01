'use client'

import { trpc } from '@/utils/trpc'
import OplWarehouseItemPageBase from '../../../../admin-panel/components/warehouse/details/OplWarehouseItemPageBase'
import OplItemTabs from '../../../components/warehouse/OplItemTabs'
import OplItemHeaderTech from '../../../components/warehouse/details/OplItemHeaderTech'

const TechnicianWarehouseItemPage = () => {
  const useQueryFn = (name: string) =>
    trpc.opl.warehouse.getItemsByName.useQuery(
      { name, scope: 'technician' },
      { enabled: !!name }
    )

  return (
    <OplWarehouseItemPageBase
      useQueryFn={useQueryFn}
      ItemHeaderComponent={OplItemHeaderTech}
      ItemTabsComponent={OplItemTabs}
    />
  )
}

export default TechnicianWarehouseItemPage
