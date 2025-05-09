'use client'

import ItemHeader from '@/app/admin-panel/components/warehouse/details/ItemHeader'
import ItemTabs from '@/app/admin-panel/components/warehouse/details/ItemTabs'
import MaxWidthWrapper from '@/app/components/MaxWidthWrapper'
import PageHeader from '@/app/components/PageHeader'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { devicesTypeMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { toast } from 'sonner'

const WarehouseItemPage = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const name = decodeURIComponent(useParams<{ name: string }>().name)
  const { data, isLoading, isError } = trpc.warehouse.getItemsByName.useQuery({
    name,
  })

  const router = useRouter()

  if (isLoading) return <Skeleton className="h-[200px] w-full" />
  if (isError || !data) {
    toast.error('Nie udało się załadować danych.')
    return (
      <div className="flex items-center justify-center text-center text-muted-foreground w-full pt-16">
        Błąd ładowania
      </div>
    )
  }

  const headerString = `${data && devicesTypeMap[data[0].category!]} ${name}`

  return (
    <MaxWidthWrapper className="space-y-4">
      <PageHeader title={headerString} />
      <div className="flex justify-between w-full">
        <Button variant="ghost" onClick={() => router.back()} className="">
          <MdKeyboardArrowLeft />
          Powrót
        </Button>
        {/* Search input field */}
        <div className="w-full sm:w-1/2 lg:w-1/4">
          <SearchInput
            placeholder="Szukaj"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>
      <ItemHeader items={data} />
      <ItemTabs items={data} />
    </MaxWidthWrapper>
  )
}

export default WarehouseItemPage
