'use client'

import OplTechnicianMonthlyDetails from '@/app/(modules)/opl-crm/components/billing/OplTechnicianMonthlyDetails'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import MonthPicker from '@/app/components/MonthPicker'
import PageControlBar from '@/app/components/PageControlBar'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { OPL_PATH } from '@/lib/constants'
import { OplOrderType } from '@prisma/client'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const OplTechnicianBillingPage = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [ordersTab, setOrdersTab] = useState<'INSTALLATION' | 'SERVICE'>(
    'INSTALLATION'
  )
  const { data: session, status } = useSession()
  const router = useRouter()

  const technicianId = session?.user.id ?? ''
  const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

  useEffect(() => {
    router.replace(`${OPL_PATH}/?tab=billing&from=${from}&to=${to}`, {
      scroll: false,
    })
  }, [from, to, router])

  if (status === 'loading') {
    return (
      <div className="flex justify-center pt-8">
        <LoaderSpinner />
      </div>
    )
  }

  if (!technicianId) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nie znaleziono danych technika.
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      <PageControlBar
        title="Moje rozliczenia"
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

export default OplTechnicianBillingPage
