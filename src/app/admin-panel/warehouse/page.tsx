'use client'

import WarehouseTabs from '@/app/components/shared/warehouse/WarehouseTabs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ReportsDialog from '../components/warehouse/ReportsDialog'
import ReturnedFromTechniciansSection from '../components/warehouse/ReturnedFromTechniciansSection'
import TechnicianStockSheet from '../components/warehouse/TechnicianStockSheet'
import WarehouseFloatingActions from '../components/warehouse/WarehouseFloatingActions'
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

  // modal/sheet states
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
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] pb-2 overflow-hidden">
      <WarehouseHeaderBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCategoryFilter={setCategoryFilter}
      />
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        <WarehouseSummaryCard />
        <LocationTransfersTable />
        <ReturnedFromTechniciansSection />
        <WarehouseTabs
          searchTerm={searchTerm}
          categoryFilter={categoryFilter}
        />

        {/* ✅ Floating action menu for warehouse management */}
        <WarehouseFloatingActions
          onAddManual={() => setAddOpen(true)}
          onImportExcel={() => setImportOpen(true)}
          onIssue={() => setIssueOpen(true)}
          onReturn={() => setReturnOpen(true)}
          onStockCheck={() => setStockOpen(true)}
          onSerialCheck={() => setSerialOpen(true)}
          onTransfer={() => setTransferOpen(true)}
          onHistory={() => router.push('/admin-panel/warehouse/history')}
          onReports={() => setReportsOpen(true)}
        />
      </div>

      {/* Modals & Sheets */}
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
