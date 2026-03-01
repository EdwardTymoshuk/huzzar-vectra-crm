'use client'

import OplTechnicianMonthlyDetails from '@/app/(modules)/opl-crm/components/billing/OplTechnicianMonthlyDetails'
import MonthPicker from '@/app/components/MonthPicker'
import PageControlBar from '@/app/components/PageControlBar'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { OPL_PATH } from '@/lib/constants'
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
  const returnTo = searchParams.get('returnTo')

  const initialMonth = fromParam ? new Date(fromParam) : startOfMonth(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(initialMonth)
  const [ordersTab, setOrdersTab] = useState<'INSTALLATION' | 'SERVICE'>(
    'INSTALLATION'
  )

  const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

  useEffect(() => {
    const returnToPart = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''
    router.replace(
      `${OPL_PATH}/admin-panel/billing/technician/${technicianId}?from=${from}&to=${to}${returnToPart}`,
      { scroll: false }
    )
  }, [from, to, technicianId, router, returnTo])

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      <PageControlBar
        title="Rozliczenie technika"
        leftStart={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(
                returnTo
                  ? decodeURIComponent(returnTo)
                  : `${OPL_PATH}/admin-panel?tab=billing&from=${from}&to=${to}`
              )
            }
            className="flex items-center gap-1"
          >
            <MdKeyboardArrowLeft className="w-5 h-5" />
            <span>Powrót</span>
          </Button>
        }
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
            selected={selectedMonth}
            onChange={(date) => date && setSelectedMonth(date)}
          />
        </div>
      </PageControlBar>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
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
