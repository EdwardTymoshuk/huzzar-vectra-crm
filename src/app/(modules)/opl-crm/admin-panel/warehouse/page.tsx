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
import AddModal from '../components/warehouse/add/AddModal'
import OplDeviceCheckSheet from '../components/warehouse/deviceCheck/OplDeviceCheckSheet'
import OplIssueModal from '../components/warehouse/issue/OplIssueModal'
import OplReturnModal from '../components/warehouse/return/OplReturnModal'
import OplTechnicianStockSheet from '../components/warehouse/technicianStock/OplTechnicianStockSheet'
import OplLocationTransferModal from '../components/warehouse/warehouseLocalizations/OplLocationTransferModal'

const WarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [warehouseTab, setWarehouseTab] = useState<'devices' | 'materials'>(
    'devices',
  )

  const [isAddOpen, setAddOpen] = useState(false)
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
        onIssue={() => setIssueOpen(true)}
        onReturn={() => setReturnOpen(true)}
        onStockCheck={() => setStockOpen(true)}
        onSerialCheck={() => setSerialOpen(true)}
        onTransfer={() => setTransferOpen(true)}
        onHistory={() =>
          router.push(`${OPL_PATH}/admin-panel/warehouse/history`)
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
            onIssue={() => setIssueOpen(true)}
            onReturn={() => setReturnOpen(true)}
            onStockCheck={() => setStockOpen(true)}
            onSerialCheck={() => setSerialOpen(true)}
            onTransfer={() => setTransferOpen(true)}
            onHistory={() =>
              router.push(`${OPL_PATH}/admin-panel/warehouse/history`)
            }
            onReports={() => setReportsOpen(true)}
            showImport={false}
          />
        </div>
      </div>

      {/* All modals */}
      <AddModal open={isAddOpen} onCloseAction={() => setAddOpen(false)} />
      <OplIssueModal
        open={isIssueOpen}
        onCloseAction={() => setIssueOpen(false)}
      />

      <OplReturnModal
        open={isReturnOpen}
        onCloseAction={() => setReturnOpen(false)}
      />
      <OplTechnicianStockSheet open={isStockOpen} setOpen={setStockOpen} />
      <OplDeviceCheckSheet
        open={isSerialOpen}
        onClose={() => setSerialOpen(false)}
      />
      <OplLocationTransferModal
        open={isTransferOpen}
        onCloseAction={() => setTransferOpen(false)}
      />

      <OplReportsDialog
        open={isReportsOpen}
        onClose={() => setReportsOpen(false)}
      />
    </div>
  )
}

export default WarehousePage
