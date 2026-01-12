'use client'

import ItemHeader from '@/app/(modules)/vectra-crm/admin-panel/components/warehouse/details/ItemHeader'
import ItemTabs from '@/app/(modules)/vectra-crm/admin-panel/components/warehouse/details/ItemTabs'
import WarehouseItemPageBase from '@/app/(modules)/vectra-crm/components/warehouse/WarehouseItemPageBase'
import { useActiveLocation } from '@/app/(modules)/vectra-crm/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'

const WarehouseItemPage = () => {
  const locationId = useActiveLocation()

  const useQueryFn = (name: string) =>
    trpc.vectra.warehouse.getItemsByName.useQuery(
      { name, locationId: locationId ?? undefined },
      { enabled: !!name }
    )

  return (
    <WarehouseItemPageBase
      useQueryFn={useQueryFn}
      ItemHeaderComponent={ItemHeader}
      ItemTabsComponent={(props) => (
        <ItemTabs {...props} activeLocationId={locationId ?? 'all'} />
      )}
    />
  )
}

export default WarehouseItemPage
