'use client'

import WarehouseItemHeaderBar from '@/app/components/shared/warehouse/WarehouseItemHeaderBar'
import { Skeleton } from '@/app/components/ui/skeleton'
import { devicesTypeMap } from '@/lib/constants'
import { SlimWarehouseItem } from '@/utils/warehouse'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/**
 * WarehouseItemPageBase
 * ------------------------------------------------------------------
 * Generic layout for both Admin and Technician warehouse detail pages.
 * Displays skeleton during loading, handles errors, and renders
 * passed header + tab components for given warehouse item type.
 */
interface WarehouseItemPageBaseProps {
  /** Query hook returning array of SlimWarehouseItem */
  useQueryFn: (name: string) => {
    data?: SlimWarehouseItem[]
    isLoading: boolean
    isError: boolean
  }
  /** Header component (admin / technician variant) */
  ItemHeaderComponent: React.FC<{ items: SlimWarehouseItem[] }>
  /** Tabs component (admin / technician variant) */
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

  /* --- Loading state --- */
  if (isLoading)
    return (
      <div className="space-y-6 px-4 pt-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-1/3" />
        </div>
        <div className="border rounded-md p-4 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    )

  /* --- Error / empty state --- */
  if (isError || !data) {
    toast.error('Nie udało się załadować danych.')
    return (
      <div className="flex items-center justify-center text-muted-foreground w-full pt-16">
        Błąd ładowania
      </div>
    )
  }

  /* --- Page title --- */
  const title = `${
    data[0]?.category ? devicesTypeMap[data[0].category] : ''
  } ${name}`

  /* --- Render layout --- */
  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] pb-2 overflow-hidden">
      <WarehouseItemHeaderBar title={title} />
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        <ItemHeaderComponent items={data} />
        <ItemTabsComponent items={data} />
      </div>
    </div>
  )
}

export default WarehouseItemPageBase
