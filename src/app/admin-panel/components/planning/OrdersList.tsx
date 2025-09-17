'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import { trpc } from '@/utils/trpc'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import OrderTable from './OrdersTable'

/* ----------------------------------------------------------------
 * OrdersTableSkeleton
 * - Mirrors the real table: 3 columns (Order No. / Address / Slot).
 * - Uses consistent row height, spacing, and subtle separators.
 * - Looks good on dark theme; avoids giant blocks and weird proportions.
 * ---------------------------------------------------------------- */
const OrdersTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => {
  return (
    <div className="w-full rounded-lg border overflow-hidden">
      {/* Header mirrors real table; collapses nicely on small screens */}
      <div
        className="
          grid grid-cols-1 md:[grid-template-columns:1.2fr_2fr_1fr]
          items-center gap-2 md:gap-4 bg-muted/30
          px-3 py-2 md:px-4 md:py-3
        "
      >
        <div className="text-[12px] md:text-[13px] font-medium text-muted-foreground">
          Nr zlecenia
        </div>
        <div className="text-[12px] md:text-[13px] font-medium text-muted-foreground">
          Adres
        </div>
        <div className="text-[12px] md:text-[13px] font-medium text-muted-foreground">
          Slot
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="
              grid grid-cols-1 md:[grid-template-columns:1.2fr_2fr_1fr]
              items-start gap-3 md:gap-4
              px-3 py-3 md:px-4 md:py-4
              w-full
            "
          >
            {/* col: order number */}
            <div className="min-w-0 space-y-2">
              {/* Use relative widths to avoid overflow in narrow containers */}
              <Skeleton className="h-4 w-3/4 max-w-[10rem]" /> {/* main id */}
              <Skeleton className="h-3 w-1/3 max-w-[6rem]" />{' '}
              {/* optional subline */}
            </div>

            {/* col: address (city, street) */}
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-4/5 max-w-[12rem]" /> {/* city */}
              <Skeleton className="h-4 w-11/12 max-w-[14rem]" /> {/* street */}
            </div>

            {/* col: slot (date + time-range) */}
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-2/3 max-w-[7rem]" /> {/* date */}
              <Skeleton className="h-4 w-1/2 max-w-[6rem]" /> {/* time range */}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------- Map dynamic import with a loading fallback ------------- */
const MapView = dynamic(() => import('../../components/planning/MapView'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[60vh] rounded-xl border" />,
})

/* ---------------- Component ---------------- */
const OrdersList = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [mapNonce, setMapNonce] = useState(0)

  // Load unassigned orders (lat/lng may be null)
  const {
    data: unassigned = [],
    isLoading,
    error,
  } = trpc.order.getUnassignedOrders.useQuery(undefined, {
    staleTime: 60_000,
  })

  // Build markers only for rows that have coords
  const markers = useMemo(
    () =>
      unassigned
        .filter(
          (r) =>
            typeof r.lat === 'number' &&
            !Number.isNaN(r.lat) &&
            typeof r.lng === 'number' &&
            !Number.isNaN(r.lng)
        )
        .map((r) => ({
          id: r.id,
          lat: r.lat as number,
          lng: r.lng as number,
          label: `${r.orderNumber} • ${r.city}, ${r.street}`,
        })),
    [unassigned]
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col w-full items-center gap-4">
        <h2 className="text-lg font-semibold">Nieprzypisane zlecenia</h2>

        <Tabs
          defaultValue="list"
          className="w-full space-y-4"
          onValueChange={(value) => {
            const v = value as 'list' | 'assignments'
            if (v === 'assignments') setMapNonce((n) => n + 1)
          }}
        >
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="assignments">Mapa</TabsTrigger>
          </TabsList>

          {/* LISTA */}
          <TabsContent value="list" className="space-y-4">
            {/* keep search visible for better UX */}
            <SearchInput
              placeholder="Szukaj zlecenie"
              value={searchTerm}
              onChange={setSearchTerm}
            />

            {isLoading ? <OrdersTableSkeleton rows={8} /> : <OrderTable />}
          </TabsContent>

          {/* MAPA */}
          <TabsContent value="assignments" className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {isLoading
                ? 'Ładowanie adresów…'
                : error
                ? 'Błąd ładowania adresów'
                : `Zlecenia: ${unassigned.length} • Z geolokacją: ${markers.length}`}
            </div>

            {isLoading ? (
              <Skeleton className="w-full h-[60vh] rounded-xl border" />
            ) : (
              <MapView
                key={`map-${mapNonce}`}
                mapKey={`inner-${mapNonce}`}
                markers={markers}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default OrdersList
