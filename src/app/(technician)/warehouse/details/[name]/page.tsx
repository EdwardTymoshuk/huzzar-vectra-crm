'use client'

import ItemTabs from '@/app/(technician)/components/warehouse/ItemTabs'
import ItemHeaderTech from '@/app/(technician)/components/warehouse/details/ItemHeaderTech'
import WarehouseItemPageBase from '@/app/components/shared/warehouse/WarehouseItemPageBase'
import { trpc } from '@/utils/trpc'

const TechnicianWarehouseItemPage = () => {
  const useQueryFn = (name: string) =>
    trpc.warehouse.getItemsByName.useQuery(
      { name, scope: 'technician' },
      { enabled: !!name }
    )

  return (
    <WarehouseItemPageBase
      useQueryFn={useQueryFn}
      ItemHeaderComponent={ItemHeaderTech}
      ItemTabsComponent={ItemTabs}
    />
  )
}

export default TechnicianWarehouseItemPage
