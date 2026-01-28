'use client'

import HistoryTable from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/history/OplHistoryTable'
import WarehouseHistoryHeaderBar from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/history/OplWarehouseHistoryHeaderBar'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import PaginationControls from '@/app/components/navigation/PaginationControls'
import { trpc } from '@/utils/trpc'
import { OplWarehouseAction } from '@prisma/client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

/**
 * OplWarehouseHistoryPage (Admin)
 * --------------------------------------------------
 * Full-page warehouse history view.
 * Includes:
 *  - Header bar with back button, title and filters
 *  - History table with pagination
 */
const OplWarehouseHistoryPage = () => {
  const searchParams = useSearchParams()

  const [page, setPage] = useState(Number(searchParams.get('page') || 1))
  const [limit] = useState(30)

  const [actions, setActions] = useState<OplWarehouseAction[] | undefined>()
  const [performerId, setPerformerId] = useState<string | undefined>()
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [locationId, setLocationId] = useState<string | undefined>()

  const { data, isLoading, isError } =
    trpc.opl.warehouse.getOplWarehouseHistory.useQuery({
      page,
      limit,
      actions,
      performerId,
      startDate: startDate?.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
      locationId,
    })

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      {/* ✅ Header bar */}
      <WarehouseHistoryHeaderBar
        actions={actions}
        setActions={setActions}
        performerId={performerId}
        setPerformerId={setPerformerId}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        locationId={locationId}
        setLocationId={setLocationId}
      />

      {/* ✅ Main content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-4 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <LoaderSpinner />
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-destructive text-center mt-6">
            Błąd ładowania historii magazynowej.
          </p>
        ) : (
          <>
            <HistoryTable entries={data.data} />
            <PaginationControls
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default OplWarehouseHistoryPage
