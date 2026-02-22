'use client'

import WarehouseTabs from '@/app/(modules)/vectra-crm/components/warehouse/WarehouseTabs'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { VECTRA_PATH } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import WarehouseFloatingActions from '../../../../components/WarehouseFloatingActions'
import ReportsDialog from '../components/warehouse/ReportsDialog'
import ReturnedFromTechniciansSection from '../components/warehouse/ReturnedFromTechniciansSection'
import TechnicianStockSheet from '../components/warehouse/TechnicianStockSheet'
import WarehouseHeaderBar from '../components/warehouse/WarehouseHeaderBar'
import WarehouseSummaryCard from '../components/warehouse/WarehouseSummaryCard'
import AddModal from '../components/warehouse/add/AddModal'
import ImportDevicesModal from '../components/warehouse/add/ImportDevicesModal'
import DeviceCheckSheet from '../components/warehouse/deviceCheck/DeviceCheckSheet'
import IssueModal from '../components/warehouse/issue/IssueModal'
import ReturnModal from '../components/warehouse/return/ReturnModal'
import LocationTransferModal from '../components/warehouse/warehouseLocalizations/LocationTransferModal'
import LocationTransfersTable from '../components/warehouse/warehouseLocalizations/LocationTransfersTable'

const WarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [warehouseTab, setWarehouseTab] = useState<'devices' | 'materials'>(
    'devices',
  )

  const [isAddOpen, setAddOpen] = useState(false)
  const [isImportOpen, setImportOpen] = useState(false)
  const [isIssueOpen, setIssueOpen] = useState(false)
  const [isReturnOpen, setReturnOpen] = useState(false)
  const [isStockOpen, setStockOpen] = useState(false)
  const [isSerialOpen, setSerialOpen] = useState(false)
  const [isTransferOpen, setTransferOpen] = useState(false)
  const [isReportsOpen, setReportsOpen] = useState(false)

  const router = useRouter()

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
        onAddManual={() => setAddOpen(true)}
        onImportExcel={() => setImportOpen(true)}
        onIssue={() => setIssueOpen(true)}
        onReturn={() => setReturnOpen(true)}
        onStockCheck={() => setStockOpen(true)}
        onSerialCheck={() => setSerialOpen(true)}
        onTransfer={() => setTransferOpen(true)}
        onHistory={() =>
          router.push(`${VECTRA_PATH}/admin-panel/warehouse/history`)
        }
        onReports={() => setReportsOpen(true)}
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
            onAddManual={() => setAddOpen(true)}
            onImportExcel={() => setImportOpen(true)}
            onIssue={() => setIssueOpen(true)}
            onReturn={() => setReturnOpen(true)}
            onStockCheck={() => setStockOpen(true)}
            onSerialCheck={() => setSerialOpen(true)}
            onTransfer={() => setTransferOpen(true)}
            onHistory={() =>
              router.push(`${VECTRA_PATH}/admin-panel/warehouse/history`)
            }
            onReports={() => setReportsOpen(true)}
          />
        </div>
      </div>

      {/* All modals */}
      <AddModal open={isAddOpen} onCloseAction={() => setAddOpen(false)} />
      <ImportDevicesModal
        open={isImportOpen}
        onClose={() => setImportOpen(false)}
      />
      <IssueModal
        open={isIssueOpen}
        onCloseAction={() => setIssueOpen(false)}
      />
      <ReturnModal
        open={isReturnOpen}
        onCloseAction={() => setReturnOpen(false)}
      />
      <TechnicianStockSheet open={isStockOpen} setOpen={setStockOpen} />
      <DeviceCheckSheet
        open={isSerialOpen}
        onClose={() => setSerialOpen(false)}
      />
      <LocationTransferModal
        open={isTransferOpen}
        onCloseAction={() => setTransferOpen(false)}
      />
      <ReportsDialog
        open={isReportsOpen}
        onClose={() => setReportsOpen(false)}
      />
    </div>
  )
}

export default WarehousePage
