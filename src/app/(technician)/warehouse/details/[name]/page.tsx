//src//app/(technician)/warehouse/details/[name]/page.tsx

'use client'

import ItemTabs from '@/app/(technician)/components/warehouse/ItemTabs'
import ItemHeaderTech from '@/app/(technician)/components/warehouse/details/ItemHeaderTech'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { devicesTypeMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { toast } from 'sonner'

/**
 * TechnicianWarehouseItemPage
 * ---------------------------
 * Detail view for a single warehouse item in technician panel.
 * - Shows header, search within item history, and technician-specific ItemTabs.
 * - Link back to warehouse list preserves SPA behaviour.
 */

const TechnicianWarehouseItemPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('')

  const name = decodeURIComponent(useParams<{ name: string }>().name)
  const { data, isLoading, isError } = trpc.warehouse.getItemsByName.useQuery({
    name,
    scope: 'technician',
  })

  const router = useRouter()

  /* ------------------------------- states ------------------------------ */
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

  /* -------------------------------- ui -------------------------------- */
  return (
    <MaxWidthWrapper className="space-y-4">
      <PageHeader title={headerTitle} />

      {/* back + search bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-2 w-full">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-start w-fit"
        >
          <MdKeyboardArrowLeft />
          Powrót
        </Button>
        <div className="w-full sm:w-1/2 lg:w-1/4">
          <SearchInput
            placeholder="Szukaj"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      <ItemHeaderTech items={data} />
      <ItemTabs items={data} />
    </MaxWidthWrapper>
  )
}

export default TechnicianWarehouseItemPage
