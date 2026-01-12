'use client'

import WarehouseItemHeaderBar from '@/app/(modules)/vectra-crm/components/warehouse/WarehouseItemHeaderBar'
import { devicesTypeMap } from '@/app/(modules)/vectra-crm/lib/constants'
import { SlimWarehouseItem } from '@/app/(modules)/vectra-crm/utils/warehouse'
import { Skeleton } from '@/app/components/ui/skeleton'
import { trpc } from '@/utils/trpc'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface WarehouseItemPageBaseProps {
  useQueryFn: (name: string) => {
    data?: SlimWarehouseItem[]
    isLoading: boolean
    isError: boolean
  }
  ItemHeaderComponent: React.FC<{
    items: SlimWarehouseItem[]
    definition: {
      name: string
      category: string | null
      index?: string | null
      price: number | null
      itemType: 'DEVICE' | 'MATERIAL'
    }
  }>
  ItemTabsComponent: React.FC<{
    items: SlimWarehouseItem[]
    activeLocationId?: string
  }>
}

const WarehouseItemPageBase = ({
  useQueryFn,
  ItemHeaderComponent,
  ItemTabsComponent,
}: WarehouseItemPageBaseProps) => {
  const [name, setName] = useState<string>('')
  const params = useParams<{ name: string }>()

  useEffect(() => {
    if (params?.name) setName(decodeURIComponent(params.name))
  }, [params])

  const { data, isLoading, isError } = useQueryFn(name)

  const {
    data: definition,
    isLoading: defLoading,
    isError: defError,
  } = trpc.vectra.deviceDefinition.getItemDefinition.useQuery(
    { name: name },
    { enabled: !!name }
  )

  // ----------------- Loading UI --------------------
  if (isLoading || defLoading)
    return (
      <div className="space-y-6 px-4 pt-4">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-32 w-full" />
      </div>
    )

  // ----------------- Error UI ----------------------
  if (isError || defError || !data || !definition) {
    toast.error('Nie udało się załadować danych.')
    return (
      <div className="flex items-center justify-center text-muted-foreground w-full pt-16">
        Błąd ładowania
      </div>
    )
  }

  const categoryLabel =
    definition.itemType === 'DEVICE'
      ? devicesTypeMap[definition.category ?? ''] ?? ''
      : ''

  const title = `${categoryLabel} ${name}`

  // ------------------ Render -----------------------
  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] pb-2 overflow-hidden">
      <WarehouseItemHeaderBar title={title} />

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        <ItemHeaderComponent items={data} definition={definition} />
        <ItemTabsComponent items={data} />
      </div>
    </div>
  )
}

export default WarehouseItemPageBase
