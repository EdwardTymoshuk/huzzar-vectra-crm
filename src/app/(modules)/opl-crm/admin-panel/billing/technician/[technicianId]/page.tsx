'use client'

import OplTechnicianMonthlyDetails from '@/app/(modules)/opl-crm/components/billing/OplTechnicianMonthlyDetails'
import MonthPicker from '@/app/components/MonthPicker'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { OPL_PATH } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { OplOrderType } from '@prisma/client'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { MdKeyboardArrowLeft } from 'react-icons/md'

const OplTechnicianBillingDetailsPage = ({
  params,
}: {
  params: Promise<{ technicianId: string }>
}) => {
  const { technicianId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')

  const initialMonth = fromParam ? new Date(fromParam) : startOfMonth(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(initialMonth)
  const [ordersTab, setOrdersTab] = useState<'INSTALLATION' | 'SERVICE'>(
    'INSTALLATION'
  )

  const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

  useEffect(() => {
    router.replace(
      `${OPL_PATH}/admin-panel/billing/technician/${technicianId}?from=${from}&to=${to}`,
      { scroll: false }
    )
  }, [from, to, technicianId, router])

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      <header
        className={cn(
          'flex items-center justify-between w-full border-b bg-background py-2 gap-2 mb-2'
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-1"
          >
            <MdKeyboardArrowLeft className="w-5 h-5" />
            <span>Powrót</span>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <MonthPicker
            selected={selectedMonth}
            onChange={(date) => date && setSelectedMonth(date)}
          />
          <h1 className="text-sm lg:text-lg font-semibold text-primary">
            Rozliczenie technika
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <Tabs
          value={ordersTab}
          onValueChange={(value) =>
            setOrdersTab(value as 'INSTALLATION' | 'SERVICE')
          }
          className="mb-4"
        >
          <TabsList className="mx-auto grid h-auto w-full max-w-xl grid-cols-2 gap-1 p-1">
            <TabsTrigger value="INSTALLATION" className="w-full">
              Instalacje
            </TabsTrigger>
            <TabsTrigger value="SERVICE" className="w-full">
              Serwisy
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <OplTechnicianMonthlyDetails
          technicianId={technicianId}
          selectedMonth={selectedMonth}
          orderType={
            ordersTab === 'SERVICE'
              ? OplOrderType.SERVICE
              : OplOrderType.INSTALLATION
          }
        />
      </div>
    </div>
  )
}

export default OplTechnicianBillingDetailsPage
