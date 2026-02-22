'use client'

import OplBillingMonthlySummaryTable from '@/app/(modules)/opl-crm/components/billing/OplBillingMonthlySummaryTable'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import MonthPicker from '@/app/components/MonthPicker'
import PageControlBar from '@/app/components/PageControlBar'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import UnauthorizedPage from '@/app/components/UnauthorizedPage'
import { useRole } from '@/utils/hooks/useRole'
import { OplOrderType } from '@prisma/client'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useState } from 'react'

const OplBillingPage = () => {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()))
  const [ordersTab, setOrdersTab] = useState<'INSTALLATION' | 'SERVICE'>(
    'INSTALLATION'
  )
  const { isWarehouseman, isLoading } = useRole()

  if (isLoading) return <LoaderSpinner />
  if (isWarehouseman) return <UnauthorizedPage />

  const from = format(startOfMonth(month), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      <PageControlBar
        title="Rozliczenia techników"
        centerContent={
          <Tabs
            value={ordersTab}
            onValueChange={(value) =>
              setOrdersTab(value as 'INSTALLATION' | 'SERVICE')
            }
            className="shrink-0"
          >
            <TabsList className="grid h-auto w-[280px] grid-cols-2 gap-1 p-1">
              <TabsTrigger value="INSTALLATION" className="w-full">
                Instalacje
              </TabsTrigger>
              <TabsTrigger value="SERVICE" className="w-full">
                Serwisy
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
        enableHorizontalScroll
      >
        <div className="flex items-center justify-end min-w-[220px]">
          <MonthPicker
            selected={month}
            onChange={(date) => date && setMonth(date)}
          />
        </div>
      </PageControlBar>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <OplBillingMonthlySummaryTable
          from={from}
          to={to}
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

export default OplBillingPage
