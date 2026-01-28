'use client'

import OplItemHeader from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/details/OplItemHeader'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import ItemTabs from '../../../components/warehouse/details/ItemTabs'
import OplWarehouseItemPageBase from '../../../components/warehouse/details/OplWarehouseItemPageBase'

const OplWarehouseItemPage = () => {
  const locationId = useActiveLocation()

  const useQueryFn = (name: string) =>
    trpc.opl.warehouse.getItemsByName.useQuery(
      { name, locationId: locationId ?? undefined },
      { enabled: !!name }
    )

  return (
    <OplWarehouseItemPageBase
      useQueryFn={useQueryFn}
      ItemHeaderComponent={OplItemHeader}
      ItemTabsComponent={(props) => (
        <ItemTabs {...props} activeLocationId={locationId ?? 'all'} />
      )}
    />
  )
}

export default OplWarehouseItemPage
