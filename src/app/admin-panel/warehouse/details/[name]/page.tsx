'use client'

import ItemHeader from '@/app/admin-panel/components/warehouse/details/ItemHeader'
import ItemTabs from '@/app/admin-panel/components/warehouse/details/ItemTabs'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { devicesTypeMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { toast } from 'sonner'

/**
 * WarehouseItemPage
 * Entry point for a single device/material detail page:
 * - Header stats (ItemHeader)
 * - 4-mode tabs (ItemTabs)
 * - Top-level search field for quick filtering within the page
 */
const WarehouseItemPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [name, setName] = useState<string>('')

  const router = useRouter()
  const params = useParams<{ name: string }>()

  const { data, isLoading, isError } = trpc.warehouse.getItemsByName.useQuery(
    { name },
    { enabled: !!name }
  )

  useEffect(() => {
    if (params?.name) setName(decodeURIComponent(params.name))
  }, [params])

  if (isLoading) return <Skeleton className="h-[200px] w-full" />
  if (isError || !data) {
    toast.error('Nie udało się załadować danych.')
    return (
      <div className="flex items-center justify-center text-center text-muted-foreground w-full pt-16">
        Błąd ładowania
      </div>
    )
  }

  // Compose a friendly page title from category + item name.
  const headerString = `${data && devicesTypeMap[data[0].category!]} ${name}`

  return (
    <MaxWidthWrapper className="space-y-4">
      <PageHeader title={headerString} />
      <div className="flex justify-between w-full">
        {/* Keep "Back" as ghost; it's a common pattern in admin tools */}
        <Button variant="ghost" onClick={() => router.push('/?tab=warehouse')}>
          <MdKeyboardArrowLeft />
          Powrót
        </Button>

        {/* Page-level search; tied to context or parent state elsewhere */}
        <div className="w-full sm:w-1/2 lg:w-1/4">
          <SearchInput
            placeholder="Szukaj"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      {/* Header metrics: stock/technicians/orders breakdown */}
      <ItemHeader items={data} />

      {/* Four tabs, each uses the same base list, filtered inside ItemTabs */}
      <ItemTabs items={data} />
    </MaxWidthWrapper>
  )
}

export default WarehouseItemPage
