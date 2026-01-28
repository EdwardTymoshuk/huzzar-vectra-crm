'use client'

import WarehouseFloatingActions from '@/app/components/WarehouseFloatingActions'
import { OPL_PATH } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import WarehouseTabs from '../../components/warehouse/WarehouseTabs'
import LocationTransfersTable from '../components/warehouse/LocationTransfersTable'
import ReturnedFromTechniciansSection from '../components/warehouse/ReturnedFromTechniciansSection'
import WarehouseHeaderBar from '../components/warehouse/WarehouseHeaderBar'
import WarehouseSummaryCard from '../components/warehouse/WarehouseSummaryCard'
import AddModal from '../components/warehouse/add/AddModal'
import OplIssueModal from '../components/warehouse/issue/OplIssueModal'

const WarehousePage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

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
      {/* Header */}
      <WarehouseHeaderBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCategoryFilter={setCategoryFilter}
        onAddManual={() => setAddOpen(true)}
        onImportExcel={() => setImportOpen(true)}
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
              router.push(`${OPL_PATH}/admin-panel/warehouse/history`)
            }
            onReports={() => setReportsOpen(true)}
          />
        </div>
      </div>

      {/* All modals */}
      <AddModal open={isAddOpen} onCloseAction={() => setAddOpen(false)} />
      {/* <ImportDevicesModal
        open={isImportOpen}
        onClose={() => setImportOpen(false)}
      /> */}
      <OplIssueModal
        open={isIssueOpen}
        onCloseAction={() => setIssueOpen(false)}
      />
      {/*
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
      /> */}
    </div>
  )
}

export default WarehousePage
