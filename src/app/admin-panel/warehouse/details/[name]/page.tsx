'use client'

import ItemHeader from '@/app/admin-panel/components/warehouse/details/ItemHeader'
import ItemTabs from '@/app/admin-panel/components/warehouse/details/ItemTabs'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { devicesTypeMap } from '@/lib/constants'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { toast } from 'sonner'

/**
 * WarehouseItemPage
 * - Only shows header and tabs.
 * - Filtering and searching is now delegated to ItemModeTable.
 */
const WarehouseItemPage = () => {
  const [name, setName] = useState<string>('')

  const router = useRouter()
  const params = useParams<{ name: string }>()
  const locationId = useActiveLocation()

  const { data, isLoading, isError } = trpc.warehouse.getItemsByName.useQuery(
    { name, locationId: locationId ?? undefined },
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

  const headerString = `${devicesTypeMap[data[0].category!]} ${name}`

  return (
    <MaxWidthWrapper className="space-y-4">
      <PageHeader title={headerString} />

      <Button variant="ghost" onClick={() => router.back()} className="w-fit">
        <MdKeyboardArrowLeft />
        Powrót
      </Button>

      <ItemHeader items={data} />
      <ItemTabs items={data} />
    </MaxWidthWrapper>
  )
}

export default WarehouseItemPage
