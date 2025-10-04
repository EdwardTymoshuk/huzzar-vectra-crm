'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useRole } from '@/utils/hooks/useRole'
import { useState } from 'react'
import { MdAdd, MdDownload, MdUploadFile } from 'react-icons/md'
import AddOrderModal from './AddOrderModal'
import ImportOrdersModal from './ImportOrdersModal'
import ReportDialog from './ReportDialog'

type Props = {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

const OrdersToolbar = ({ searchTerm, setSearchTerm }: Props) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isReportDialogOpen, setReportDialogOpen] = useState(false)
  const [isImportModalOpen, setImportModalOpen] = useState(false)

  const { isAdmin, isCoordinator, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return <LoaderSpinner />
  const canManageOrders = isAdmin || isCoordinator

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* LEFT ACTIONS */}
      {canManageOrders && (
        <div className="flex flex-wrap gap-2">
          {/* ADD MANUALLY */}
          <Button variant="success" onClick={() => setAddModalOpen(true)}>
            <MdAdd />
            <span className="hidden lg:inline">Dodaj ręcznie</span>
          </Button>

          {/* IMPORT EXCEL */}
          <Button variant="warning" onClick={() => setImportModalOpen(true)}>
            <MdUploadFile />
            <span className="hidden lg:inline">Wczytaj z Excela</span>
          </Button>

          {/* REPORT */}
          <Button variant="default" onClick={() => setReportDialogOpen(true)}>
            <MdDownload />
            <span className="hidden lg:inline">Raport</span>
          </Button>
        </div>
      )}

      {/* SEARCH */}
      <div className="w-full sm:w-1/2 lg:w-1/4">
        <SearchInput
          placeholder="Szukaj po nr zlecenia lub adresie"
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {/* MODALS */}
      {canManageOrders && (
        <>
          <AddOrderModal
            open={isAddModalOpen}
            onCloseAction={() => setAddModalOpen(false)}
          />
          <ImportOrdersModal
            open={isImportModalOpen}
            onClose={() => setImportModalOpen(false)}
          />
          <ReportDialog
            open={isReportDialogOpen}
            onClose={() => setReportDialogOpen(false)}
          />
        </>
      )}
    </div>
  )
}

export default OrdersToolbar
