'use client'

import HistoryFilters from '@/app/admin-panel/components/warehouse/history/HistoryFilters'
import HistoryTable from '@/app/admin-panel/components/warehouse/history/HistoryTable'
import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import PageHeader from '@/app/components/shared/PageHeader'
import { Button } from '@/app/components/ui/button'
import { trpc } from '@/utils/trpc'
import { WarehouseAction } from '@prisma/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import PaginationControls from '../../components/warehouse/history/PaginationControls'

const WarehouseHistoryPage = () => {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [page, setPage] = useState(Number(searchParams.get('page') || 1))
  const [limit] = useState(30)

  const [actions, setActions] = useState<WarehouseAction[] | undefined>()
  const [performerId, setPerformerId] = useState<string | undefined>()
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const { data, isLoading, isError } =
    trpc.warehouse.getWarehouseHistory.useQuery({
      page,
      limit,
      actions,
      performerId,
      startDate: startDate?.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
    })

  return (
    <MaxWidthWrapper className="space-y-6">
      <PageHeader title="Historia magazynu" />
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mr-auto w-fit"
      >
        <MdKeyboardArrowLeft />
        Powrót
      </Button>
      <HistoryFilters
        actions={actions}
        setActions={setActions}
        performerId={performerId}
        setPerformerId={setPerformerId}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />
      {isLoading ? (
        <LoaderSpinner />
      ) : isError || !data ? (
        <p className="text-sm text-destructive">
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
    </MaxWidthWrapper>
  )
}

export default WarehouseHistoryPage
