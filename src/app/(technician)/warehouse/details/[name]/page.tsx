'use client'

import ItemTabs from '@/app/(technician)/components/warehouse/ItemTabs'
import ItemHeaderTech from '@/app/(technician)/components/warehouse/details/ItemHeaderTech'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { devicesTypeMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { toast } from 'sonner'

/**
 * TechnicianWarehouseItemPage
 * ---------------------------
 * Detail view for a single warehouse item in technician panel.
 * - Shows header and technician-specific ItemTabs.
 * - Filtering moved inside TechItemTable.
 */
const TechnicianWarehouseItemPage = () => {
  const [name, setName] = useState<string>('')

  const params = useParams<{ name: string }>()
  const router = useRouter()

  const { data, isLoading, isError } = trpc.warehouse.getItemsByName.useQuery(
    { name, scope: 'technician' },
    { enabled: !!name }
  )

  useEffect(() => {
    if (params?.name) {
      setName(decodeURIComponent(params.name))
    }
  }, [params])

  if (isLoading) return <Skeleton className="h-[200px] w-full" />

  if (isError || !data) {
    toast.error('Nie udało się załadować danych.')
    return (
      <div className="flex items-center justify-center text-muted-foreground w-full pt-16">
        Błąd ładowania
      </div>
    )
  }

  const headerTitle = `${
    data[0].category ? devicesTypeMap[data[0].category!] : ''
  } ${name}`

  return (
    <MaxWidthWrapper className="space-y-4">
      <PageHeader title={headerTitle} />

      {/* back only */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="text-start w-fit"
      >
        <MdKeyboardArrowLeft />
        Powrót
      </Button>

      <ItemHeaderTech items={data} />
      <ItemTabs items={data} />
    </MaxWidthWrapper>
  )
}

export default TechnicianWarehouseItemPage
