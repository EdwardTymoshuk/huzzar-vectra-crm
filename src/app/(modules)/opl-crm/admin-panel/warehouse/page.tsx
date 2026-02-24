'use client'

import WarehouseFloatingActions from '@/app/components/WarehouseFloatingActions'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { OPL_PATH } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import WarehouseTabs from '../../components/warehouse/OplWarehouseTabs'
import LocationTransfersTable from '../components/warehouse/LocationTransfersTable'
import OplReportsDialog from '../components/warehouse/OplReportsDialog'
import ReturnedFromTechniciansSection from '../components/warehouse/ReturnedFromTechniciansSection'
import WarehouseHeaderBar from '../components/warehouse/WarehouseHeaderBar'
import WarehouseSummaryCard from '../components/warehouse/WarehouseSummaryCard'
import OplDeviceCheckSheet from '../components/warehouse/deviceCheck/OplDeviceCheckSheet'
import OplTechnicianStockSheet from '../components/warehouse/technicianStock/OplTechnicianStockSheet'

const WarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [warehouseTab, setWarehouseTab] = useState<'devices' | 'materials'>(
    'devices',
  )

  const [isNavigatingAdd, setIsNavigatingAdd] = useState(false)
  const [isNavigatingReturn, setIsNavigatingReturn] = useState(false)
  const [isStockOpen, setStockOpen] = useState(false)
  const [isSerialOpen, setSerialOpen] = useState(false)
  const [isNavigatingTransfer, setIsNavigatingTransfer] = useState(false)
  const [isReportsOpen, setReportsOpen] = useState(false)
  const [isNavigatingIssue, setIsNavigatingIssue] = useState(false)
  const [isNavigatingHistory, setIsNavigatingHistory] = useState(false)

  const router = useRouter()

  const goToIssuePage = () => {
    setIsNavigatingIssue(true)
    router.push(`${OPL_PATH}/admin-panel/warehouse/issue`)
  }

  const goToReceivePage = () => {
    setIsNavigatingAdd(true)
    router.push(`${OPL_PATH}/admin-panel/warehouse/receive`)
  }

  const goToReturnPage = () => {
    setIsNavigatingReturn(true)
    router.push(`${OPL_PATH}/admin-panel/warehouse/return`)
  }

  const goToTransferPage = () => {
    setIsNavigatingTransfer(true)
    router.push(`${OPL_PATH}/admin-panel/warehouse/transfer`)
  }

  const goToHistoryPage = () => {
    setIsNavigatingHistory(true)
    router.push(`${OPL_PATH}/admin-panel/warehouse/history`)
  }

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 pb-2 overflow-hidden">
      {/* Header */}
      <WarehouseHeaderBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCategoryFilter={setCategoryFilter}
        centerContent={
          <Tabs
            value={warehouseTab}
            onValueChange={(value) =>
              setWarehouseTab(value as 'devices' | 'materials')
            }
            className="shrink-0"
          >
            <TabsList className="grid h-auto grid-cols-2 gap-1 p-1 w-[260px]">
              <TabsTrigger value="devices">Urządzenia</TabsTrigger>
              <TabsTrigger value="materials">Materiały</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        onAddManual={goToReceivePage}
        onIssue={goToIssuePage}
        onReturn={goToReturnPage}
        onStockCheck={() => setStockOpen(true)}
        onSerialCheck={() => setSerialOpen(true)}
        onTransfer={goToTransferPage}
        onHistory={goToHistoryPage}
        onReports={() => setReportsOpen(true)}
        addLoading={isNavigatingAdd}
        issueLoading={isNavigatingIssue}
        returnLoading={isNavigatingReturn}
        transferLoading={isNavigatingTransfer}
        historyLoading={isNavigatingHistory}
      />

      {/* Page content */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        <WarehouseSummaryCard />
        <LocationTransfersTable />
        <ReturnedFromTechniciansSection />

        <WarehouseTabs
          searchTerm={searchTerm}
          categoryFilter={categoryFilter}
          value={warehouseTab}
          onValueChange={setWarehouseTab}
          hideTabsList
        />

        {/* FAB only for < xl */}
        <div className="xl:hidden">
          <WarehouseFloatingActions
            onAddManual={goToReceivePage}
            onIssue={goToIssuePage}
            onReturn={goToReturnPage}
            onStockCheck={() => setStockOpen(true)}
            onSerialCheck={() => setSerialOpen(true)}
            onTransfer={goToTransferPage}
            onHistory={goToHistoryPage}
            onReports={() => setReportsOpen(true)}
            showImport={false}
          />
        </div>
      </div>

      {/* All modals */}
      <OplTechnicianStockSheet open={isStockOpen} setOpen={setStockOpen} />
      <OplDeviceCheckSheet
        open={isSerialOpen}
        onClose={() => setSerialOpen(false)}
      />
      <OplReportsDialog
        open={isReportsOpen}
        onClose={() => setReportsOpen(false)}
      />
    </div>
  )
}

export default WarehousePage
