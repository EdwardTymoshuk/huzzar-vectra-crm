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
          items-center
          justify-end
          w-full gap-2 sm:gap-3
          px-0 sm:px-0
        "
      >
        {/* Tabs for selecting range */}
        <div className="flex justify-end sm:justify-start ">
          <Tabs
            value={range}
            onValueChange={(val) => onChangeRange(val as typeof range)}
            className="flex-1 sm:flex-none"
          >
            <TabsList
              className="
    w-full
    min-w-0
    overflow-hidden
    grid grid-cols-3 mb-0
  "
            >
              <TabsTrigger
                value="day"
                className="min-w-0 overflow-hidden flex justify-center"
              >
                <span className="truncate">
                  <span className="hidden xs:inline">Dzień</span>
                  <span className="xs:hidden">D</span>
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="month"
                className="min-w-0 overflow-hidden flex justify-center"
              >
                <span className="truncate">
                  <span className="hidden xs:inline">Miesiąc</span>
                  <span className="xs:hidden">M</span>
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="year"
                className="min-w-0 overflow-hidden flex justify-center"
              >
                <span className="truncate">
                  <span className="hidden xs:inline">Rok</span>
                  <span className="xs:hidden">R</span>
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* DatePicker */}
        <div className="flex justify-end sm:justify-start">
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
