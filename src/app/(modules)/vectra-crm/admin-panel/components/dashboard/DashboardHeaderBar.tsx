'use client'

import DatePicker from '@/app/components/DatePicker'
import PageControlBar from '@/app/components/PageControlBar'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'

interface DashboardHeaderBarProps {
  selectedDate: Date | undefined
  onChangeDate: (date: Date | undefined) => void
  range: 'day' | 'month' | 'year'
  onChangeRange: (range: 'day' | 'month' | 'year') => void
}

/**
 * DashboardHeaderBar
 * --------------------------------------------------
 * Unified top control bar for the Dashboard page.
 * - On mobile: full-width layout (elements edge-to-edge)
 * - On desktop: classic bar with title left, filters right
 */
const DashboardHeaderBar = ({
  selectedDate,
  onChangeDate,
  range,
  onChangeRange,
}: DashboardHeaderBarProps) => {
  return (
    <PageControlBar title="Pulpit">
      <div
        className="
          flex flex-row
          items-center sm:items-center
          justify-center sm:justify-end
          w-full gap-2 sm:gap-3
          px-0 sm:px-0
        "
      >
        {/* Tabs for selecting range */}
        <div className="flex w-auto justify-between sm:justify-end">
          <Tabs
            value={range}
            onValueChange={(val) => onChangeRange(val as typeof range)}
            className="flex-1 sm:flex-none"
          >
            <TabsList className="flex w-full sm:w-auto justify-between">
              <TabsTrigger value="day" className="flex-1">
                Dzień
              </TabsTrigger>
              <TabsTrigger value="month" className="flex-1">
                Miesiąc
              </TabsTrigger>
              <TabsTrigger value="year" className="flex-1">
                Rok
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* DatePicker */}
        <div className="flex w-full sm:max-w-[180px] justify-end">
          <DatePicker
            selected={selectedDate}
            onChange={onChangeDate}
            range={range}
          />
        </div>
      </div>
    </PageControlBar>
  )
}

export default DashboardHeaderBar
