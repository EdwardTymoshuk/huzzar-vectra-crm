'use client'

import ItemTabs from '@/app/(modules)/vectra-crm/(technician)/components/warehouse/ItemTabs'
import ItemHeaderTech from '@/app/(modules)/vectra-crm/(technician)/components/warehouse/details/ItemHeaderTech'
import WarehouseItemPageBase from '@/app/(modules)/vectra-crm/components/warehouse/WarehouseItemPageBase'
import { trpc } from '@/utils/trpc'

const TechnicianWarehouseItemPage = () => {
  const useQueryFn = (name: string) =>
    trpc.vectra.warehouse.getItemsByName.useQuery(
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
