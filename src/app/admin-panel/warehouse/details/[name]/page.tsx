'use client'

import ItemHeader from '@/app/admin-panel/components/warehouse/details/ItemHeader'
import ItemTabs from '@/app/admin-panel/components/warehouse/details/ItemTabs'
import WarehouseItemPageBase from '@/app/components/shared/warehouse/WarehouseItemPageBase'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'

const WarehouseItemPage = () => {
  const locationId = useActiveLocation()

  const useQueryFn = (name: string) =>
    trpc.warehouse.getItemsByName.useQuery(
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
