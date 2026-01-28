'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import { OplSlimWarehouseItem } from '@/app/(modules)/opl-crm/utils/warehouse/warehouse'
import { Skeleton } from '@/app/components/ui/skeleton'
import { trpc } from '@/utils/trpc'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import OplWarehouseItemDetailHeaderBar from './OplWarehouseItemHeaderBar'

interface OplWarehouseItemPageBaseProps {
  useQueryFn: (name: string) => {
    data?: OplSlimWarehouseItem[]
    isLoading: boolean
    isError: boolean
  }
  ItemHeaderComponent: React.FC<{
    items: OplSlimWarehouseItem[]
    definition: {
      name: string
      category: string | null
      index?: string | null
      price: number | null
      itemType: 'DEVICE' | 'MATERIAL'
    }
  }>
  ItemTabsComponent: React.FC<{
    items: OplSlimWarehouseItem[]
    activeLocationId?: string
  }>
}

const OplWarehouseItemPageBase = ({
  useQueryFn,
  ItemHeaderComponent,
  ItemTabsComponent,
}: OplWarehouseItemPageBaseProps) => {
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
  } = trpc.opl.settings.getOplDeviceItemDefinition.useQuery(
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
      ? oplDevicesTypeMap[definition.category ?? ''] ?? ''
      : ''

  const title = `${categoryLabel} ${name}`

  // ------------------ Render -----------------------
  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] pb-2 overflow-hidden">
      <OplWarehouseItemDetailHeaderBar title={title} />

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        <ItemHeaderComponent items={data} definition={definition} />
        <ItemTabsComponent items={data} />
      </div>
    </div>
  )
}

export default OplWarehouseItemPageBase
